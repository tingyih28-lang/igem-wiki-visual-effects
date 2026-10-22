import uploadedImages from "./footerReliefAssets.json";

/** Paste the four iGEM upload URLs in footerReliefAssets.json before release.
 * A common VITE_FOOTER_RELIEF_URL directory remains an optional override. */
const published = import.meta.env.VITE_FOOTER_RELIEF_URL as string | undefined;
export const footerReliefBase = published?.replace(/\/$/, "");

export function footerReliefImage(file: string): string | undefined {
  const source = footerReliefBase
    ? `${footerReliefBase}/${file}`
    : uploadedImages[file as keyof typeof uploadedImages] || undefined;
  if (!source) return undefined;
  // Refresh all four textures together after replacing the static uploads.
  return `${source}${source.includes("?") ? "&" : "?"}v=genesis-moon-right-v5`;
}
