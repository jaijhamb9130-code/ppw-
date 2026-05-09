import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { Response } from 'express';
import { Readable } from 'stream';
import { ItemDetail } from '../entities/item-detail.entity';
import { ItemMedia } from '../entities/item-media.entity';
import { StockItem } from '../entities/stock-item.entity';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class ItemDetailsService {
  private readonly logger = new Logger(ItemDetailsService.name);
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private tmpDir: string;
  private localMediaRoot: string;

  constructor(
    @InjectRepository(ItemDetail)
    private detailRepo: Repository<ItemDetail>,
    @InjectRepository(ItemMedia)
    private mediaRepo: Repository<ItemMedia>,
    @InjectRepository(StockItem)
    private stockItemRepo: Repository<StockItem>,
  ) {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.S3_BUCKET_NAME || '';
    if (!this.bucket) {
      this.logger.error(
        'S3_BUCKET_NAME is not set — uploads will fail. Set the env var on Elastic Beanstalk.',
      );
    }
    this.s3 = new S3Client({ region: this.region });
    this.tmpDir = path.join(process.cwd(), 'tmp', 'videos');
    if (!fs.existsSync(this.tmpDir)) fs.mkdirSync(this.tmpDir, { recursive: true });
    this.localMediaRoot = path.join(process.cwd(), 'public');
  }

  private s3Key(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `uploads/items/videos/${urlName}.webm`
      : `uploads/items/${urlName}.webp`;
  }

  private mediaProxyPath(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `/api/media/items/videos/${urlName}.webm`
      : `/api/media/items/${urlName}.webp`;
  }

  private buildMediaUrl(baseUrl: string | undefined, urlName: string, slot: string): string {
    const proxyPath = this.mediaProxyPath(urlName, slot);
    const explicit = (process.env.BACKEND_PUBLIC_URL || '').replace(/\/$/, '');
    const base = (baseUrl || explicit || '').replace(/\/$/, '');
    return base ? `${base}${proxyPath}` : proxyPath;
  }

  async getDetails(masterid: string, baseUrl?: string) {
    const detail = await this.detailRepo.findOne({ where: { masterid } });
    const rawMedia = await this.mediaRepo.find({
      where: { masterid },
      order: { slot: 'ASC' },
    });
    const media = rawMedia.map((m) => ({
      ...m,
      url: this.buildMediaUrl(baseUrl, m.url_name, m.slot),
    }));
    return { detail, media };
  }

  async streamMedia(
    s3Key: string,
    res: Response,
    contentType: string,
  ): Promise<void> {
    if (this.bucket) {
      try {
        const obj = await this.s3.send(
          new GetObjectCommand({ Bucket: this.bucket, Key: s3Key }),
        );
        res.setHeader('Content-Type', obj.ContentType || contentType);
        res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
        if (obj.ContentLength) {
          res.setHeader('Content-Length', String(obj.ContentLength));
        }
        if (obj.ETag) res.setHeader('ETag', obj.ETag);
        if (obj.Body instanceof Readable) {
          obj.Body.pipe(res);
          return;
        }
      } catch (err: any) {
        const code = err?.name || err?.Code;
        if (code !== 'NoSuchKey' && code !== 'NotFound' && code !== 'AccessDenied') {
          this.logger.warn(`S3 stream failed for ${s3Key}: ${err?.message || err}`);
        }
      }
    }

    const localPath = path.join(this.localMediaRoot, s3Key);
    if (fs.existsSync(localPath) && fs.statSync(localPath).isFile()) {
      res.setHeader('Content-Type', contentType);
      res.setHeader('Cache-Control', 'public, max-age=86400, immutable');
      res.setHeader('Content-Length', String(fs.statSync(localPath).size));
      fs.createReadStream(localPath).pipe(res);
      return;
    }

    res.status(404).send('Media not found');
  }

  private async compressImage(buffer: Buffer): Promise<Buffer> {
    return sharp(buffer)
      .resize({ width: 800, withoutEnlargement: true })
      .webp({ quality: 75 })
      .toBuffer();
  }

  private compressVideo(inputPath: string, outputPath: string): Promise<void> {
    return new Promise((resolve, reject) => {
      ffmpeg(inputPath)
        .videoCodec('libvpx-vp9')
        .audioCodec('libopus')
        .audioBitrate('64k')
        .outputOptions(['-crf 33', '-b:v 0', '-vf scale=480:-2', '-deadline realtime', '-cpu-used 4'])
        .output(outputPath)
        .on('end', () => resolve())
        .on('error', (err: Error) => reject(err))
        .run();
    });
  }

  private async deleteFromS3(urlName: string, slot: string): Promise<void> {
    try {
      await this.s3.send(new DeleteObjectCommand({
        Bucket: this.bucket,
        Key: this.s3Key(urlName, slot),
      }));
    } catch { /* ignore missing */ }
  }

  async saveDetails(
    masterid: string,
    description: string,
    userId: number,
    mediaFiles: { slot: string; file: Express.Multer.File }[],
    removedSlots: string[],
    name?: string,
    baseUrl?: string,
  ) {
    if (name) {
      await this.stockItemRepo.update({ masterid }, { name });
    }

    let detail = await this.detailRepo.findOne({ where: { masterid } });
    if (detail) {
      detail.description = description;
      detail.updated_by = userId;
    } else {
      detail = this.detailRepo.create({ masterid, description, updated_by: userId });
    }
    await this.detailRepo.save(detail);

    for (const slot of removedSlots) {
      await this.deleteMedia(masterid, slot);
    }

    const stockItem = await this.stockItemRepo.findOne({ where: { masterid } });
    const nameCode = stockItem?.name?.match(/^(\S+)/)?.[1];
    const code = stockItem?.ats_barcode || nameCode || masterid;

    for (const { slot, file } of mediaFiles) {
      const existing = await this.mediaRepo.findOne({ where: { masterid, slot } });
      if (existing) {
        await this.deleteFromS3(existing.url_name, slot);
        await this.mediaRepo.remove(existing);
      }

      const urlName = `${code}${slot}`;
      const key = this.s3Key(urlName, slot);

      if (slot.startsWith('vid')) {
        const tempIn = path.join(this.tmpDir, `in_${Date.now()}.webm`);
        const tempOut = path.join(this.tmpDir, `out_${Date.now()}.webm`);
        fs.writeFileSync(tempIn, file.buffer);
        try {
          await this.compressVideo(tempIn, tempOut);
          const videoBuffer = fs.readFileSync(tempOut);
          await this.s3.send(new PutObjectCommand({
            Bucket: this.bucket,
            Key: key,
            Body: videoBuffer,
            ContentType: 'video/webm',
          })).catch((err) => {
            console.error(`S3 video upload failed for key=${key}:`, err?.message || err);
            throw err;
          });
        } finally {
          if (fs.existsSync(tempIn)) fs.unlinkSync(tempIn);
          if (fs.existsSync(tempOut)) fs.unlinkSync(tempOut);
        }
      } else {
        const compressed = await this.compressImage(file.buffer);
        await this.s3.send(new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: compressed,
          ContentType: 'image/webp',
        })).catch((err) => {
          console.error(`S3 image upload failed for key=${key}:`, err?.message || err);
          throw err;
        });
      }

      const type = slot.startsWith('vid') ? 'video' : 'image';
      await this.mediaRepo.save(
        this.mediaRepo.create({ masterid, slot, type, url_name: urlName, uploaded_by: userId }),
      );
    }

    return this.getDetails(masterid, baseUrl);
  }

  async deleteMedia(masterid: string, slot: string) {
    const existing = await this.mediaRepo.findOne({ where: { masterid, slot } });
    if (existing) {
      await this.deleteFromS3(existing.url_name, slot);
      await this.mediaRepo.remove(existing);
    }
    return { success: true };
  }
}
