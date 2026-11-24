/** Lo que una landing dice de sí misma en `/build.json`. */
export interface SiteBuildInfo {
  /** Versión del contenido con el que se construyó; `null` si no leía del api. */
  version: string | null;
  builtAt: string | null;
}

export interface SiteProbe {
  /** `null` si la web no responde o no publica su información de build. Nunca lanza. */
  read(siteUrl: string): Promise<SiteBuildInfo | null>;
}
