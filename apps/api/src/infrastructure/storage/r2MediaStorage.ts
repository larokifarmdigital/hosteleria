import { AwsClient } from 'aws4fetch';
import type { MediaStorage } from '../../domain/services/mediaStorage.js';
import type { Env } from '../../env.js';

/**
 * Impl del `MediaStorage` sobre Cloudflare R2.
 *
 * **Dos APIs conviven**:
 *  1. `env.MEDIA` (R2 binding nativo) → `head`/`delete` directo desde el Worker.
 *  2. `aws4fetch` → genera presigned PUT URLs (el binding nativo no las soporta).
 *
 * El `AwsClient` se cachea por isolate — construirlo en cada request
 * desperdicia CPU time.
 */
let _s3Client: AwsClient | null = null;

export class R2MediaStorage implements MediaStorage {
  constructor(private env: Env) {}

  private get s3Client(): AwsClient {
    if (_s3Client) return _s3Client;
    _s3Client = new AwsClient({
      accessKeyId: this.env.R2_ACCESS_KEY_ID,
      secretAccessKey: this.env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto'
    });
    return _s3Client;
  }

  async createUploadUrl(input: {
    key: string;
    contentType: string;
    expiresIn?: number;
  }): Promise<{ uploadUrl: string; publicUrl: string; key: string; expiresIn: number }> {
    const expiresIn = input.expiresIn ?? 300;
    const endpoint = `https://${this.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.env.R2_BUCKET}/${input.key}`;
    const url = new URL(endpoint);
    url.searchParams.set('X-Amz-Expires', String(expiresIn));

    const signed = await this.s3Client.sign(
      new Request(url, { method: 'PUT', headers: { 'Content-Type': input.contentType } }),
      { aws: { signQuery: true } }
    );

    return {
      uploadUrl: signed.url,
      publicUrl: `${this.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${input.key}`,
      key: input.key,
      expiresIn
    };
  }

  async head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    const obj = await this.env.MEDIA.head(key);
    if (!obj) return null;
    return {
      sizeBytes: obj.size,
      contentType: obj.httpMetadata?.contentType
    };
  }

  async delete(key: string): Promise<void> {
    await this.env.MEDIA.delete(key);
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
