import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  UploadedFiles,
  UseInterceptors,
  Delete,
  Req,
} from '@nestjs/common';
import type { Request } from 'express';
import { AnyFilesInterceptor } from '@nestjs/platform-express';
import { ItemDetailsService } from './item-details.service';

function originOf(req: Request): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string)?.split(',')[0]?.trim() ||
    req.protocol;
  const host =
    (req.headers['x-forwarded-host'] as string)?.split(',')[0]?.trim() ||
    req.get('host');
  return `${proto}://${host}`;
}

@Controller('item-details')
export class ItemDetailsController {
  constructor(private readonly service: ItemDetailsService) {}

  @Get(':masterid')
  async getDetails(@Param('masterid') masterid: string, @Req() req: Request) {
    return this.service.getDetails(masterid, originOf(req));
  }

  @Post(':masterid')
  @UseInterceptors(AnyFilesInterceptor({ limits: { fileSize: 500 * 1024 * 1024 } }))
  async saveDetails(
    @Param('masterid') masterid: string,
    @Body() body: any,
    @UploadedFiles() files: Express.Multer.File[],
    @Req() req: Request,
  ) {
    const description = body.description || '';
    const name = body.name || undefined;
    const userId = parseInt(body.user_id) || 0;

    // Combine removed slots from both images and videos into one array of slot strings
    const removedSlots: string[] = [
      ...(body.removed_slots ? JSON.parse(body.removed_slots).map((n: number) => `img${n}`) : []),
      ...(body.removed_video_slots ? JSON.parse(body.removed_video_slots).map((n: number) => `vid${n}`) : []),
    ];

    const mediaFiles = (files || []).map((file) => {
      const imgMatch = file.fieldname.match(/image_(\d+)/);
      const vidMatch = file.fieldname.match(/video_(\d+)/);
      const slot = imgMatch ? `img${imgMatch[1]}` : vidMatch ? `vid${vidMatch[1]}` : 'img1';
      return { slot, file };
    });

    return this.service.saveDetails(
      masterid,
      description,
      userId,
      mediaFiles,
      removedSlots,
      name,
      originOf(req),
    );
  }

  @Delete(':masterid/media/:slot')
  async deleteMedia(
    @Param('masterid') masterid: string,
    @Param('slot') slot: string,
  ) {
    return this.service.deleteMedia(masterid, slot);
  }
}
