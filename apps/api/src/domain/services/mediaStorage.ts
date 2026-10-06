/**
 * El binario vive en un bucket externo; la metadata vive en
 * `MediaRepository`. Esta es la cara "objeto" (R2/S3).
 */
export interface MediaStorage {
  /**
   * URL firmada para PUT directo browser→bucket (el Worker no proxea el
   * binario, evita CPU time y límites de body size).
   */
  createUploadUrl(input: {
    key: string;
    contentType: string;
    /** Default 300s. */
    expiresIn?: number;
  }): Promise<{
    uploadUrl: string;
    publicUrl: string;
    key: string;
    expiresIn: number;
  }>;

  /** Verificación post-upload: `null` = el PUT nunca llegó. */
  head(key: string): Promise<{ sizeBytes: number; contentType?: string } | null>;

  /** Idempotente: si no existe, no lanza. */
  delete(key: string): Promise<void>;

  /** `"Foto Comedor 01 .JPG"` → `{ name: "foto-comedor-01", extension: "jpg" }`. */
  normalizeFilename(filename: string): { name: string; extension: string };
}
