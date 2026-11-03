import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';
import { AppError } from '../lib/errors.js';

export const MAX_BYTES = 5 * 1024 * 1024; // 5 MB (media_uploads skill)
export const MAX_DIMENSION = 6000;
const ALLOWED: Record<string, 'jpeg' | 'png' | 'webp'> = {
  'image/jpeg': 'jpeg',
  'image/png': 'png',
  'image/webp': 'webp',
};

export interface ProcessedImage {
  buffer: Buffer;
  mime: 'image/jpeg' | 'image/png' | 'image/webp';
  ext: 'jpg' | 'png' | 'webp';
  width: number;
  height: number;
}

const reject415 = (msg: string, hi: string) => new AppError(415, 'unsupported_media_type', msg, hi);

/**
 * Validate by magic bytes (not extension or declared type), then re-encode.
 * Re-encoding drops EXIF/GPS and neutralises polyglot payloads appended to a real image.
 */
export async function processImage(input: Buffer): Promise<ProcessedImage> {
  if (input.length === 0) throw reject415('Empty file', 'फ़ाइल खाली है');
  if (input.length > MAX_BYTES) {
    throw new AppError(413, 'payload_too_large', 'File larger than 5 MB', 'फ़ाइल 5 MB से बड़ी है');
  }
  const detected = await fileTypeFromBuffer(input);
  const format = detected ? ALLOWED[detected.mime] : undefined;
  if (!detected || !format) {
    throw reject415('Only JPEG, PNG or WebP images are allowed', 'केवल JPEG, PNG या WebP चित्र स्वीकार्य हैं');
  }
  try {
    const meta = await sharp(input, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION, failOn: 'error' }).metadata();
    if (!meta.width || !meta.height || meta.width > MAX_DIMENSION || meta.height > MAX_DIMENSION) {
      throw new AppError(422, 'validation_failed', 'Image dimensions too large', 'चित्र का आकार बहुत बड़ा है');
    }
    let pipeline = sharp(input, { limitInputPixels: MAX_DIMENSION * MAX_DIMENSION, failOn: 'error' }).rotate();
    pipeline = format === 'jpeg' ? pipeline.jpeg({ quality: 88 }) : format === 'png' ? pipeline.png() : pipeline.webp({ quality: 88 });
    const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
    return {
      buffer: data,
      mime: detected.mime as ProcessedImage['mime'],
      ext: format === 'jpeg' ? 'jpg' : format,
      width: info.width,
      height: info.height,
    };
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw reject415('Image could not be read', 'चित्र पढ़ा नहीं जा सका');
  }
}

/** Store under a random key. The client's filename is never used. */
export async function storeImage(dir: string, img: ProcessedImage): Promise<string> {
  const key = `${randomBytes(16).toString('hex')}.${img.ext}`;
  await mkdir(dir, { recursive: true });
  await writeFile(path.join(dir, key), img.buffer, { mode: 0o644 });
  return key;
}
