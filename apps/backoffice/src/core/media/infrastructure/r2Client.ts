import { AwsClient } from 'aws4fetch';
import type { Env } from '@/core/shared';

type R2Env = Pick<Env, 'R2_ACCOUNT_ID' | 'R2_ACCESS_KEY_ID' | 'R2_SECRET_ACCESS_KEY' | 'R2_BUCKET'>;

export interface R2Object {
  key: string;
  sizeBytes: number;
  uploadedAt: Date;
}

// Si R2 no contesta, la petición del backoffice no debe quedarse colgada hasta
// el límite de la función.
const TIMEOUT_MS = 15_000;

/** R2 por su API S3. Las mismas claves firman las URLs de subida del navegador. */
export class R2Client {
  private aws: AwsClient | null = null;

  constructor(private env: R2Env) {}

  private get client(): AwsClient {
    return (this.aws ??= new AwsClient({
      accessKeyId: this.env.R2_ACCESS_KEY_ID,
      secretAccessKey: this.env.R2_SECRET_ACCESS_KEY,
      service: 's3',
      region: 'auto',
      // Por defecto reintenta diez veces con espera creciente: más de lo que dura una petición.
      retries: 2
    }));
  }

  private get bucketUrl(): string {
    return `https://${this.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${this.env.R2_BUCKET}`;
  }

  objectUrl(key: string): string {
    return `${this.bucketUrl}/${key.split('/').map(encodeURIComponent).join('/')}`;
  }

  /** URL firmada para que el navegador suba el fichero directo al bucket. */
  async signUploadUrl(key: string, contentType: string, expiresIn: number): Promise<string> {
    const url = new URL(this.objectUrl(key));
    url.searchParams.set('X-Amz-Expires', String(expiresIn));
    const signed = await this.client.sign(
      new Request(url, { method: 'PUT', headers: { 'Content-Type': contentType } }),
      { aws: { signQuery: true } }
    );
    return signed.url;
  }

  async head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null> {
    const res = await this.send(this.objectUrl(key), { method: 'HEAD' });
    if (res.status === 404) return null;
    await assertOk(res, 'HEAD', key);
    return {
      sizeBytes: Number(res.headers.get('content-length') ?? 0),
      contentType: res.headers.get('content-type') ?? undefined
    };
  }

  /** Idempotente: S3 responde 204 también cuando el objeto no existe. */
  async delete(key: string): Promise<void> {
    const res = await this.send(this.objectUrl(key), { method: 'DELETE' });
    if (res.status === 404) return;
    await assertOk(res, 'DELETE', key);
  }

  async put(key: string, body: string, opts: { contentType: string; metadata?: Record<string, string> }): Promise<void> {
    const headers: Record<string, string> = { 'Content-Type': opts.contentType };
    for (const [name, value] of Object.entries(opts.metadata ?? {})) headers[`x-amz-meta-${name}`] = value;
    const res = await this.send(this.objectUrl(key), { method: 'PUT', headers, body });
    await assertOk(res, 'PUT', key);
  }

  async list(prefix: string): Promise<R2Object[]> {
    const objects: R2Object[] = [];
    let token: string | null = null;
    do {
      const url = new URL(this.bucketUrl);
      url.searchParams.set('list-type', '2');
      url.searchParams.set('prefix', prefix);
      if (token) url.searchParams.set('continuation-token', token);
      const res = await this.send(url.toString(), { method: 'GET' });
      await assertOk(res, 'LIST', prefix);
      const xml = await res.text();
      objects.push(...parseListObjects(xml));
      token = xmlTag(xml, 'IsTruncated') === 'true' ? xmlTag(xml, 'NextContinuationToken') : null;
    } while (token);
    return objects;
  }

  private send(url: string, init: RequestInit): Promise<Response> {
    return this.client.fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  }
}

async function assertOk(res: Response, operation: string, target: string): Promise<void> {
  if (res.ok) return;
  const detail = (await res.text().catch(() => '')).slice(0, 200);
  throw new Error(`R2 ${operation} ${target}: ${res.status} ${detail}`);
}

/** Respuesta de ListObjectsV2. Es un XML plano y conocido: no merece un parser. */
export function parseListObjects(xml: string): R2Object[] {
  return [...xml.matchAll(/<Contents>([\s\S]*?)<\/Contents>/g)].map(([, item]) => ({
    key: xmlTag(item, 'Key') ?? '',
    sizeBytes: Number(xmlTag(item, 'Size') ?? 0),
    uploadedAt: new Date(xmlTag(item, 'LastModified') ?? 0)
  })).filter(object => object.key !== '');
}

function xmlTag(xml: string, tag: string): string | null {
  const match = xml.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match ? decodeXml(match[1]) : null;
}

function decodeXml(text: string): string {
  return text
    .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'")
    .replace(/&amp;/g, '&');
}
