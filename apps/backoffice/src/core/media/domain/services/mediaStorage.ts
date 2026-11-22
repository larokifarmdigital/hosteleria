export interface MediaStorage {
  /** PUT directo browser→bucket: el Worker no proxea el binario (CPU time y
   *  límites de body size). */
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
