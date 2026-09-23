#!/usr/bin/env node
/**
 * Print VRM/GLB embedded metadata (title, author, license, allowedUserName).
 * Usage: node tools/vrm-meta.mjs path/to/model.vrm
 */
import fs from "node:fs";
import { basename } from "node:path";

/**
 * @param {Buffer} buf
 */
function readGlbJsonChunk(buf) {
  if (buf.length < 12) return null;
  const magic = buf.toString("utf8", 0, 4);
  if (magic !== "glTF") return null;
  let offset = 12;
  while (offset + 8 <= buf.length) {
    const chunkLength = buf.readUInt32LE(offset);
    const chunkType = buf.toString("utf8", offset + 4, offset + 8);
    offset += 8;
    if (chunkLength <= 0 || offset + chunkLength > buf.length) break;
    if (chunkType === "JSON") {
      const jsonText = buf.toString("utf8", offset, offset + chunkLength);
      return JSON.parse(jsonText);
    }
    offset += chunkLength;
  }
  return null;
}

/**
 * @param {unknown} gltf
 */
function extractVrmMeta(gltf) {
  const ext = gltf?.extensions?.VRM ?? gltf?.extensions?.VRMC_vrm;
  if (!ext) return null;
  const meta = ext.meta ?? ext;
  return {
    title: meta.title ?? meta.modelName,
    author: meta.author ?? meta.authors?.join?.(", "),
    contactInformation: meta.contactInformation,
    reference: meta.reference,
    allowedUserName: meta.allowedUserName,
    violentUssageName: meta.violentUssageName ?? meta.violentUsageName,
    sexualUssageName: meta.sexualUssageName ?? meta.sexualUsageName,
    commercialUssageName: meta.commercialUssageName ?? meta.commercialUsageName,
    otherPermissionUrl: meta.otherPermissionUrl,
    licenseName: meta.licenseName ?? meta.licenseUrl,
  };
}

function main() {
  const file = process.argv[2];
  if (!file) {
    console.error("Usage: node tools/vrm-meta.mjs <file.vrm>");
    process.exit(1);
  }
  const buf = fs.readFileSync(file);
  const gltf = readGlbJsonChunk(buf);
  if (!gltf) {
    console.error("Not a GLB/VRM file:", file);
    process.exit(1);
  }
  const meta = extractVrmMeta(gltf);
  console.log(JSON.stringify({ file: basename(file), bytes: buf.length, vrmMeta: meta }, null, 2));
}

main();
