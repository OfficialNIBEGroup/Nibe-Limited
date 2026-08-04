/**
 * Convert large photo-like PNGs to JPEG and rewrite HTML/CSS/JS references.
 * Skips logo/partner icons (often need transparency).
 */
import fs from "fs";
import path from "path";
import sharp from "sharp";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MIN_BYTES = 120 * 1024;
const SKIP_DIR_PARTS = ["Nibe Limited Logo", "Our Partners", "node_modules", ".git", ".vercel", "scripts"];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    const rel = path.relative(ROOT, full);
    if (entry.isDirectory()) {
      if (SKIP_DIR_PARTS.some((p) => rel === p || rel.startsWith(p + path.sep))) continue;
      walk(full, files);
    } else if (path.extname(entry.name).toLowerCase() === ".png") {
      files.push(full);
    }
  }
  return files;
}

function walkText(dir, files = []) {
  const textExt = new Set([".html", ".css", ".js"]);
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".git", ".vercel", "scripts"].includes(entry.name)) continue;
      walkText(full, files);
    } else if (textExt.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

const pngs = walk(ROOT).filter((f) => fs.statSync(f).size >= MIN_BYTES);
console.log(`Converting ${pngs.length} large PNGs → JPEG…`);

const replacements = []; // { fromRel, toRel, fromPosix, toPosix }

for (const png of pngs) {
  try {
    const input = fs.readFileSync(png);
    const meta = await sharp(input, { failOn: "none" }).metadata();
    if (meta.hasAlpha) {
      // keep transparent assets
      console.log(`skip (alpha): ${path.relative(ROOT, png)}`);
      continue;
    }

    const jpgPath = png.replace(/\.png$/i, ".jpg");
    const buffer = await sharp(input, { failOn: "none" })
      .rotate()
      .resize({ width: 1600, height: 1600, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 72, progressive: true, mozjpeg: true })
      .toBuffer();

    fs.writeFileSync(jpgPath, buffer);
    const before = fs.statSync(png).size;
    fs.unlinkSync(png);

    const fromRel = path.relative(ROOT, png);
    const toRel = path.relative(ROOT, jpgPath);
    replacements.push({
      fromRel,
      toRel,
      fromPosix: fromRel.split(path.sep).join("/"),
      toPosix: toRel.split(path.sep).join("/"),
      // also Windows-style paths that might appear
      fromWin: fromRel,
      toWin: toRel,
    });

    console.log(
      `✓ ${fromRel} → ${toRel}  ${(before / 1024).toFixed(0)}KB → ${(buffer.length / 1024).toFixed(0)}KB`
    );
  } catch (e) {
    console.warn(`✗ ${path.relative(ROOT, png)}: ${e.message}`);
  }
}

if (!replacements.length) {
  console.log("No conversions.");
  process.exit(0);
}

const textFiles = walkText(ROOT);
let fileHits = 0;
for (const tf of textFiles) {
  let content = fs.readFileSync(tf, "utf8");
  let original = content;
  for (const r of replacements) {
    // Replace path variants carefully
    content = content.split(r.fromPosix).join(r.toPosix);
    content = content.split(r.fromWin).join(r.toWin);
    // URL-encoded spaces
    content = content.split(encodeURI(r.fromPosix)).join(encodeURI(r.toPosix));
  }
  if (content !== original) {
    fs.writeFileSync(tf, content);
    fileHits++;
    console.log(`updated refs: ${path.relative(ROOT, tf)}`);
  }
}

console.log(`\nDone. Converted ${replacements.length} images, updated ${fileHits} text files.`);
