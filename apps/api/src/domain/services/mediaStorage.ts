/**
 * Puerto para almacenamiento de media (binarios).
 *
 * El binario vive en un bucket externo (R2, S3, etc.); la metadata vive en
 * la BD (`MediaRepository`).
 *
 * Impl concreta: `infrastructure/storage/r2MediaStorage.ts` usa aws4fetch
 * para presigned URLs + el binding R2 nativo para head/delete.
 */

export interface MediaStorage {
  /**
   * Genera una URL firmada para que el browser suba un objeto directo al
   * bucket. El Worker nunca toca el binario — solo firma.
   */
  createUploadUrl(input: {
    key: string;
    contentType: string;
    /** Segundos antes de que la URL firmada caduque. Default 300 (5 min). */
    expiresIn?: number;
  }): Promise<{
    uploadUrl: string;
    /** URL pública del objeto una vez subido (via R2 public domain). */
    publicUrl: string;
    key: string;
    expiresIn: number;
  }>;

  /** Metadata del objeto si existe. `null` si no. Usado para verificar
   *  que el browser realmente completó la subida antes del confirm. */
  head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null>;

  /** Borra un objeto. Idempotente (si no existe, no lanza). */
  delete(key: string): Promise<void>;

  /**
   * Normaliza un nombre de archivo para la key en el bucket.
   * `"Foto Comedor 01 .JPG"` → `{ name: "foto-comedor-01", extension: "jpg" }`
   */
  normalizeFilename(filename: string): { name: string; extension: string };
}
