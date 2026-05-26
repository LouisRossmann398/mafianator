import sharp from "sharp";
import { readFileSync } from "node:fs";

const svg = readFileSync("public/icon-source.svg");
const maskableSvg = Buffer.from(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512"><rect width="512" height="512" fill="#dc2626"/><text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" font-family="system-ui, sans-serif" font-weight="900" font-size="220" fill="#fafafa">M</text></svg>',
);

await sharp(svg).resize(192, 192).png().toFile("public/icon-192.png");
await sharp(svg).resize(512, 512).png().toFile("public/icon-512.png");
await sharp(maskableSvg).resize(512, 512).png().toFile("public/icon-512-maskable.png");
await sharp(svg).resize(180, 180).png().toFile("public/apple-touch-icon.png");

console.log("icons generated");
