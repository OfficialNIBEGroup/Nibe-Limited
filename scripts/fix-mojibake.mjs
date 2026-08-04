/**
 * Fix UTF-8 mojibake across HTML/CSS/JS.
 * Typical cause: UTF-8 bytes re-decoded as Windows-1252/Latin-1.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const EXT = new Set([".html", ".css", ".js"]);

// Longest-first replacements so multi-byte sequences win
const REPLACEMENTS = [
  // common double-encoded / mojibake sequences
  ["âœ¦", "✦"], // black four-pointed star (bullet used on product pages)
  ["âœ”", "✔"],
  ["â˜…", "★"],
  ["â€”", "—"], // em dash
  ["â€“", "–"], // en dash
  ["â€˜", "‘"],
  ["â€™", "’"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€¢", "•"],
  ["â€¦", "…"],
  ["â‰¥", "≥"],
  ["â‰¤", "≤"],
  ["Ã—", "×"],
  ["Â©", "©"],
  ["Â®", "®"],
  ["Â°", "°"],
  ["Â±", "±"],
  ["Â·", "·"],
  ["Â ", " "], // non-breaking space corrupted
  ["Â", ""], // leftover Â before special chars
  // other frequent corruptions
  ["Ã—", "×"],
  ["â€‘", "‑"],
  ["â€¯", " "],
];

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name.startsWith(".")) continue;
    if (["node_modules", ".git", ".vercel", "scripts"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, files);
    else if (EXT.has(path.extname(entry.name).toLowerCase())) files.push(full);
  }
  return files;
}

function fixText(text) {
  let out = text;
  let total = 0;
  const counts = {};
  for (const [bad, good] of REPLACEMENTS) {
    if (!bad) continue;
    let n = 0;
    // count then replace
    let idx = 0;
    while (true) {
      const i = out.indexOf(bad, idx);
      if (i === -1) break;
      n++;
      idx = i + bad.length;
    }
    if (n > 0) {
      out = out.split(bad).join(good);
      counts[`${JSON.stringify(bad)} → ${JSON.stringify(good)}`] = n;
      total += n;
    }
  }
  return { out, total, counts };
}

const files = walk(ROOT);
let fileCount = 0;
let changeCount = 0;

for (const file of files) {
  const raw = fs.readFileSync(file);
  // Prefer UTF-8; if file has BOM strip it
  let text = raw.toString("utf8");
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const { out, total, counts } = fixText(text);
  if (total > 0) {
    fs.writeFileSync(file, out, "utf8");
    fileCount++;
    changeCount += total;
    console.log(`\n${path.relative(ROOT, file)} (${total} fixes)`);
    for (const [k, v] of Object.entries(counts)) console.log(`  ${k}: ${v}`);
  }
}

console.log(`\nDone. Updated ${fileCount} files, ${changeCount} replacements.`);
