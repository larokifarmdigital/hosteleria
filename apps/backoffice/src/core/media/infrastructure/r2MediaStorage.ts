import type { MediaStorage } from '../domain/services/mediaStorage';
import type { Env } from '@/core/shared';
import { R2Client } from './r2Client';

export class R2MediaStorage implements MediaStorage {
  private readonly r2: R2Client;

  constructor(private env: Env) {
    this.r2 = new R2Client(env);
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
    const expiresIn = input.expiresIn ?? 300;
    return {
      uploadUrl: await this.r2.signUploadUrl(input.key, input.contentType, expiresIn),
      publicUrl: `${this.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${input.key}`,
      key: input.key,
      expiresIn
    };
  }

  head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    return this.r2.head(key);
  }

  delete(key: string): Promise<void> {
    return this.r2.delete(key);
  }

  normalizeFilename(filename: string): { name: string; extension: string } {
    const dotIdx = filename.lastIndexOf('.');
    const rawName = dotIdx > 0 ? filename.slice(0, dotIdx) : filename;
    const extension = (dotIdx > 0 ? filename.slice(dotIdx + 1) : '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');
    const name = rawName
      .toLowerCase()
      .normalize('NFD').replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    return { name: name || 'file', extension: extension || 'bin' };
  }
}
