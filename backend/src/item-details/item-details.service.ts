import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemDetail } from '../entities/item-detail.entity';
import { ItemMedia } from '../entities/item-media.entity';
import { StockItem } from '../entities/stock-item.entity';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class ItemDetailsService {
  private s3: S3Client;
  private bucket: string;
  private region: string;
  private tmpDir: string;

  constructor(
    @InjectRepository(ItemDetail)
    private detailRepo: Repository<ItemDetail>,
    @InjectRepository(ItemMedia)
    private mediaRepo: Repository<ItemMedia>,
    @InjectRepository(StockItem)
    private stockItemRepo: Repository<StockItem>,
  ) {
    this.region = process.env.AWS_REGION || 'ap-south-1';
    this.bucket = process.env.S3_BUCKET_NAME!;
    this.s3 = new S3Client({ region: this.region });
    this.tmpDir = path.join(process.cwd(), 'tmp', 'videos');
    if (!fs.existsSync(this.tmpDir)) fs.mkdirSync(this.tmpDir, { recursive: true });
  }

  private s3Key(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `uploads/items/videos/${urlName}.webm`
      : `uploads/items/${urlName}.webp`;
  }

  private s3Url(urlName: string, slot: string): string {
    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${this.s3Key(urlName, slot)}`;
  }

  async getDetails(masterid: string) {
    const detail = await this.detailRepo.findOne({ where: { masterid } });
    const rawMedia = await this.mediaRepo.find({
      where: { masterid },
      order: { slot: 'ASC' },
    });
    const media = rawMedia.map((m) => ({
      ...m,
      url: this.s3Url(m.url_name, m.slot),
    }));
    return { detail, media };
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
          }));
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
        }));
      }

      const type = slot.startsWith('vid') ? 'video' : 'image';
      await this.mediaRepo.save(
        this.mediaRepo.create({ masterid, slot, type, url_name: urlName, uploaded_by: userId }),
      );
    }

    return this.getDetails(masterid);
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
