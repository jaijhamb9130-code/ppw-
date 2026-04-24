import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ItemDetail } from '../entities/item-detail.entity';
import { ItemMedia } from '../entities/item-media.entity';
import { StockItem } from '../entities/stock-item.entity';
import * as fs from 'fs';
import * as path from 'path';
import sharp from 'sharp';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpeg = require('fluent-ffmpeg');
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ffmpegInstaller = require('@ffmpeg-installer/ffmpeg');
ffmpeg.setFfmpegPath(ffmpegInstaller.path);

@Injectable()
export class ItemDetailsService {
  private imgDir: string;
  private vidDir: string;

  constructor(
    @InjectRepository(ItemDetail)
    private detailRepo: Repository<ItemDetail>,
    @InjectRepository(ItemMedia)
    private mediaRepo: Repository<ItemMedia>,
    @InjectRepository(StockItem)
    private stockItemRepo: Repository<StockItem>,
  ) {
    this.imgDir = path.join(process.cwd(), 'public', 'uploads', 'items');
    this.vidDir = path.join(process.cwd(), 'public', 'uploads', 'items', 'videos');
    for (const dir of [this.imgDir, this.vidDir]) {
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    }
  }

  private fileUrl(urlName: string, slot: string): string {
    return slot.startsWith('vid')
      ? `public/uploads/items/videos/${urlName}.webm`
      : `public/uploads/items/${urlName}.webp`;
  }

  private filePath(urlName: string, slot: string): string {
    return path.join(process.cwd(), this.fileUrl(urlName, slot));
  }

  async getDetails(masterid: string) {
    const detail = await this.detailRepo.findOne({ where: { masterid } });
    const rawMedia = await this.mediaRepo.find({
      where: { masterid },
      order: { slot: 'ASC' },
    });
    const media = rawMedia.map((m) => ({
      ...m,
      url: this.fileUrl(m.url_name, m.slot),
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

    // Upsert description
    let detail = await this.detailRepo.findOne({ where: { masterid } });
    if (detail) {
      detail.description = description;
      detail.updated_by = userId;
    } else {
      detail = this.detailRepo.create({ masterid, description, updated_by: userId });
    }
    await this.detailRepo.save(detail);

    // Remove deleted slots
    for (const slot of removedSlots) {
      await this.deleteMedia(masterid, slot);
    }

    // Get item code from ats_barcode or first word of item name (e.g. "001627 BP 10/-" → "001627")
    const stockItem = await this.stockItemRepo.findOne({ where: { masterid } });
    const nameCode = stockItem?.name?.match(/^(\S+)/)?.[1];
    const code = stockItem?.ats_barcode || nameCode || masterid;

    // Save + compress new media
    for (const { slot, file } of mediaFiles) {
      // Remove existing record for this slot
      const existing = await this.mediaRepo.findOne({ where: { masterid, slot } });
      if (existing) {
        const fp = this.filePath(existing.url_name, slot);
        if (fs.existsSync(fp)) fs.unlinkSync(fp);
        await this.mediaRepo.remove(existing);
      }

      const urlName = `${code}${slot}`; // e.g. 000078img1

      if (slot.startsWith('vid')) {
        const tempPath = path.join(this.vidDir, `tmp_${Date.now()}.webm`);
        const outPath = path.join(this.vidDir, `${urlName}.webm`);
        fs.writeFileSync(tempPath, file.buffer);
        try {
          await this.compressVideo(tempPath, outPath);
        } finally {
          if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);
        }
      } else {
        const compressed = await this.compressImage(file.buffer);
        fs.writeFileSync(path.join(this.imgDir, `${urlName}.webp`), compressed);
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
      const fp = this.filePath(existing.url_name, slot);
      if (fs.existsSync(fp)) fs.unlinkSync(fp);
      await this.mediaRepo.remove(existing);
    }
    return { success: true };
  }
}
