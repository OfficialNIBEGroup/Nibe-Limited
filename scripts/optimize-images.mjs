/**
 * Compress & resize images in place for faster page loads.
 * Writes via temp file (Windows-safe), keeps original filenames.
 */
import fs from "fs";
import path from "path";
import os from "os";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MAX_EDGE = 1600;
const SKIP_DIRS = new Set(["node_modules", ".git", ".vercel", "scripts"]);
const IMAGE_EXT = new Set([".jpg", ".jpeg", ".png", ".webp", ".avif"]);

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (IMAGE_EXT.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function optimizeFile(file) {
  const ext = path.extname(file).toLowerCase();
  const before = fs.statSync(file).size;
  if (before < 30 * 1024) return { file, before, after: before, skipped: true };

  // Read fully into memory first (avoids Windows file-lock on same path)
  const input = fs.readFileSync(file);
  const meta = await sharp(input, { failOn: "none" }).metadata();

  let pipeline = sharp(input, { failOn: "none" }).rotate().resize({
    width: MAX_EDGE,
    height: MAX_EDGE,
    fit: "inside",
    withoutEnlargement: true,
  });

  let buffer;
  if (ext === ".jpg" || ext === ".jpeg") {
    buffer = await pipeline
      .jpeg({ quality: 72, progressive: true, mozjpeg: true })
      .toBuffer();
  } else if (ext === ".png") {
    // Prefer strong PNG compression; for large opaque photos try palette + plain and pick smaller
    const plain = await pipeline
      .clone()
      .png({ compressionLevel: 9, effort: 10 })
      .toBuffer();

    if (!meta.hasAlpha && before > 200 * 1024) {
      const paletted = await sharp(input, { failOn: "none" })
        .rotate()
        .resize({
          width: MAX_EDGE,
          height: MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .png({ compressionLevel: 9, effort: 10, palette: true, colors: 256 })
        .toBuffer();
      buffer = paletted.length < plain.length ? paletted : plain;
    } else {
      buffer = plain;
    }
  } else if (ext === ".webp") {
    buffer = await pipeline.webp({ quality: 72 }).toBuffer();
  } else if (ext === ".avif") {
    buffer = await pipeline.avif({ quality: 55 }).toBuffer();
  } else {
    return { file, before, after: before, skipped: true };
  }

  if (buffer.length >= before * 0.98) {
    return { file, before, after: before, skipped: true };
  }

  // Atomic-ish replace via temp in same directory
  const tmp = path.join(
    path.dirname(file),
    `.opt-${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`
  );
  fs.writeFileSync(tmp, buffer);
  try {
    fs.renameSync(tmp, file);
  } catch {
    // Fallback if rename fails on Windows
    fs.copyFileSync(tmp, file);
    try {
      fs.unlinkSync(tmp);
    } catch {}
  }

  return { file, before, after: buffer.length, skipped: false };
}

const files = walk(ROOT);
console.log(`Found ${files.length} images…`);

let saved = 0;
let beforeTotal = 0;
let afterTotal = 0;
let processed = 0;
let failed = 0;

for (const file of files) {
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try {
      const result = await optimizeFile(file);
      beforeTotal += result.before;
      afterTotal += result.after;
      processed++;
      ok = true;
      if (!result.skipped) {
        const pct = ((1 - result.after / result.before) * 100).toFixed(1);
        const rel = path.relative(ROOT, result.file);
        console.log(
          `✓ ${rel}  ${(result.before / 1024).toFixed(0)}KB → ${(result.after / 1024).toFixed(0)}KB  (-${pct}%)`
        );
        saved += result.before - result.after;
      }
    } catch (err) {
      if (attempt === 3) {
        failed++;
        console.warn(`✗ ${path.relative(ROOT, file)}: ${err.message}`);
      } else {
        await sleep(50 * attempt);
      }
    }
  }
}

console.log("\nDone.");
console.log(`Processed: ${processed}, Failed: ${failed}`);
console.log(`Saved: ${(saved / 1024 / 1024).toFixed(2)} MB`);
console.log(
  `Total: ${(beforeTotal / 1024 / 1024).toFixed(2)} MB → ${(afterTotal / 1024 / 1024).toFixed(2)} MB`
);
