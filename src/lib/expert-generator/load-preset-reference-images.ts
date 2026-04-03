import fs from "fs";
import path from "path";

const MAX_FILES = 6;
const MAX_BYTES_PER_FILE = 5 * 1024 * 1024;

export type PresetRefImage = { mimeType: string; base64: string };

/**
 * Lê imagens em `src/lib/expert-generator/expert/<packId>/` para envio ao Gemini Image.
 * `packId` pode ser aninhado (ex.: `mans/jose`).
 */
export function loadPresetReferenceImages(packId: string): PresetRefImage[] {
  const normalized = packId.replace(/\\/g, "/").trim();
  if (!normalized || normalized.startsWith("/") || normalized.includes("..")) {
    return [];
  }
  const segments = normalized.split("/").filter(Boolean);
  const dir = path.join(
    process.cwd(),
    "src/lib/expert-generator/expert",
    ...segments
  );
  if (!fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        `[expert-generator] Pasta de referências não encontrada: ${dir} (packId=${packId})`
      );
    }
    return [];
  }

  const names = fs
    .readdirSync(dir)
    .filter((f) => /\.(png|jpe?g|webp)$/i.test(f))
    /** `card.png` = miniatura do UI; referências faciais são ref*.png / refe*.png */
    .filter((f) => !/^card\.(png|jpe?g|webp)$/i.test(f))
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
    );

  const out: PresetRefImage[] = [];

  for (const name of names) {
    if (out.length >= MAX_FILES) break;
    const fp = path.join(dir, name);
    let stat: fs.Stats;
    try {
      stat = fs.statSync(fp);
    } catch {
      continue;
    }
    if (!stat.isFile() || stat.size > MAX_BYTES_PER_FILE) continue;

    let buf: Buffer;
    try {
      buf = fs.readFileSync(fp);
    } catch {
      continue;
    }

    const lower = name.toLowerCase();
    const mimeType = lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : "image/jpeg";

    out.push({ mimeType, base64: buf.toString("base64") });
  }

  if (out.length === 0) {
    console.warn(
      `[expert-generator] Nenhuma imagem ref*.png|jpeg|webp em ${dir} (excl. card.*) — preset "${packId}" sem fotos para o Gemini.`
    );
  }

  return out;
}
