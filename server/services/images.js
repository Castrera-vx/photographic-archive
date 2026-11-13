import sharp from 'sharp';
import exifr from 'exifr';
import crypto from 'node:crypto';
import config from '../config.js';
import { shapeExif } from './fields.js';

export const SIZES = { thumb: 480, medium: 1200, large: 2400 };
const FORMATS = { jpeg: 'JPEG', png: 'PNG', webp: 'WebP' };
const TAGS = ['Make','Model','LensModel','FNumber','ExposureTime','ISO','FocalLength','DateTimeOriginal'];

export async function processImage(buffer) {
  const meta = await sharp(buffer).metadata().catch(()=>null);
  const format = FORMATS[meta?.format];
  if (!format) throw new Error('Formato no admitido (solo JPG, PNG o WebP)');
  const raw = await exifr.parse(buffer,{pick:TAGS,reviveValues:false}).catch(()=>null);
  const id = crypto.randomUUID();
  const assets=[];
  for (const [variant,px] of Object.entries(SIZES)) {
    const data=await sharp(buffer).rotate().resize({width:px,height:px,fit:'inside',withoutEnlargement:true})
      .webp({quality:variant==='thumb'?74:82}).toBuffer();
    assets.push({variant,mimeType:'image/webp',data});
  }
  if (config.keepOriginals) {
    const ext=meta.format==='jpeg'?'jpeg':meta.format;
    assets.push({variant:'original',mimeType:`image/${ext}`,data:buffer});
  }
  const dimensions=await sharp(buffer).rotate().metadata();
  return {id,format,width:dimensions.width,height:dimensions.height,exif:shapeExif(raw||{}),assets};
}
