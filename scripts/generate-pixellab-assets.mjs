#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const DEFAULT_PLAN_PATH = "scripts/pixellab.asset-plan.json";
const DEFAULT_OUT_DIR = "public/assets/pixellab";
const DEFAULT_API_BASE = "https://api.pixellab.ai/v2";

function parseArgs(argv) {
  const args = {
    plan: DEFAULT_PLAN_PATH,
    outDir: DEFAULT_OUT_DIR,
    dryRun: false,
    force: false,
    verbose: false,
    only: null,
    limit: null,
    skipBalance: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token === "--plan") {
      args.plan = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--out") {
      args.outDir = argv[i + 1];
      i += 1;
      continue;
    }
    if (token === "--only") {
      args.only = (argv[i + 1] ?? "")
        .split(",")
        .map((x) => x.trim())
        .filter(Boolean);
      i += 1;
      continue;
    }
    if (token === "--limit") {
      const raw = argv[i + 1];
      args.limit = raw ? Number(raw) : null;
      i += 1;
      continue;
    }
    if (token === "--dry-run") {
      args.dryRun = true;
      continue;
    }
    if (token === "--force") {
      args.force = true;
      continue;
    }
    if (token === "--verbose") {
      args.verbose = true;
      continue;
    }
    if (token === "--skip-balance") {
      args.skipBalance = true;
      continue;
    }
    if (token === "--help" || token === "-h") {
      printHelp();
      process.exit(0);
    }
    throw new Error(`Unknown argument: ${token}`);
  }

  if (args.limit !== null && (!Number.isFinite(args.limit) || args.limit <= 0)) {
    throw new Error(`Invalid --limit value: ${args.limit}`);
  }

  return args;
}

function printHelp() {
  console.log(`PixelLab asset generator

Usage:
  node scripts/generate-pixellab-assets.mjs [options]
  npm run assets:pixellab

Options:
  --plan <path>         Path to asset plan JSON (default: ${DEFAULT_PLAN_PATH})
  --out <dir>           Output directory (default: ${DEFAULT_OUT_DIR})
  --only <a,b,c>        Generate only matching asset ids (substring match)
  --limit <n>           Process only first n matched assets
  --dry-run             Print requests without calling the API
  --force               Overwrite existing files
  --skip-balance        Skip balance check call
  --verbose             Print request/response details
  --help                Show this help
`);
}

async function readEnvApiKey() {
  if (process.env.PIXELLAB_API_KEY) {
    return process.env.PIXELLAB_API_KEY.trim();
  }

  const envPath = path.resolve(process.cwd(), ".env");
  let raw = "";
  try {
    raw = await fs.readFile(envPath, "utf8");
  } catch {
    return null;
  }

  const match = raw.match(/PIXELLAB_API_KEY\s*[:=]\s*([A-Za-z0-9-]+)/);
  return match ? match[1] : null;
}

function ensureImageSize(size, fallback) {
  const width = Number(size?.width ?? fallback?.width ?? 64);
  const height = Number(size?.height ?? fallback?.height ?? 64);
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error(`Invalid image size: ${JSON.stringify(size)}`);
  }
  return { width, height };
}

function withStyle(plan, text) {
  const prefix = typeof plan.style_prefix === "string" ? plan.style_prefix.trim() : "";
  const suffix = typeof plan.style_suffix === "string" ? plan.style_suffix.trim() : "";
  const parts = [prefix, text, suffix].map((x) => x?.trim()).filter(Boolean);
  return parts.join(", ");
}

function decodeBase64Image(base64Input) {
  if (!base64Input || typeof base64Input !== "string") {
    throw new Error("Missing base64 image payload");
  }
  const payload = base64Input.includes(",") ? base64Input.split(",").pop() : base64Input;
  return Buffer.from(payload, "base64");
}

function pngSize(buffer) {
  const PNG_SIGNATURE = "89504e470d0a1a0a";
  if (buffer.length < 24 || buffer.subarray(0, 8).toString("hex") !== PNG_SIGNATURE) {
    return null;
  }
  return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) };
}

function extractUsage(responseJson) {
  if (responseJson?.usage) return responseJson.usage;
  if (responseJson?.data?.usage) return responseJson.data.usage;
  return null;
}

function extractImageNodes(responseJson) {
  const payload = responseJson?.data && typeof responseJson.data === "object" ? responseJson.data : responseJson;
  if (!payload || typeof payload !== "object") return [];

  if (Array.isArray(payload.images)) return payload.images;
  if (payload.image) return [payload.image];
  if (Array.isArray(payload?.last_response?.images)) return payload.last_response.images;
  if (payload?.last_response?.image) return [payload.last_response.image];
  return [];
}

async function writeImageNode(imageNode, outputPath) {
  if (typeof imageNode === "string") {
    await fs.writeFile(outputPath, decodeBase64Image(imageNode));
    return;
  }

  if (imageNode?.base64) {
    await fs.writeFile(outputPath, decodeBase64Image(imageNode.base64));
    return;
  }

  if (imageNode?.image?.base64) {
    await fs.writeFile(outputPath, decodeBase64Image(imageNode.image.base64));
    return;
  }

  if (imageNode?.url && typeof imageNode.url === "string") {
    const res = await fetch(imageNode.url);
    if (!res.ok) {
      throw new Error(`Failed downloading image URL ${imageNode.url}: ${res.status} ${res.statusText}`);
    }
    const bytes = Buffer.from(await res.arrayBuffer());
    await fs.writeFile(outputPath, bytes);
    return;
  }

  throw new Error(`Unsupported image node: ${JSON.stringify(imageNode).slice(0, 500)}`);
}

async function readImageAsReference(refPath) {
  const bytes = await fs.readFile(refPath);
  const size = pngSize(bytes);
  if (!size) {
    throw new Error(`Reference image is not a valid PNG: ${refPath}`);
  }
  return {
    image: {
      type: "base64",
      format: "png",
      base64: `data:image/png;base64,${bytes.toString("base64")}`,
    },
    size,
  };
}

async function buildReferenceObject(entry, outDir) {
  const rawPath = entry.path ?? (entry.asset_id ? path.join(outDir, `${entry.asset_id}.png`) : null);
  if (!rawPath) {
    throw new Error(`Reference image must define path or asset_id`);
  }
  const resolved = path.resolve(process.cwd(), rawPath);
  const ref = await readImageAsReference(resolved);
  return {
    image: ref.image,
    size: ref.size,
    usage_description: entry.usage_description ?? undefined,
  };
}

async function pixellabFetch(apiBaseUrl, apiKey, endpoint, method, body, verbose = false) {
  const url = `${apiBaseUrl}${endpoint}`;
  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  let parsed = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    parsed = null;
  }

  if (!res.ok) {
    const detail = parsed?.detail ?? parsed?.error ?? text ?? res.statusText;
    throw new Error(`${method} ${endpoint} failed (${res.status}): ${typeof detail === "string" ? detail : JSON.stringify(detail)}`);
  }

  if (verbose) {
    console.log(`[verbose] ${method} ${endpoint} -> ${res.status}`);
  }
  return parsed;
}

function filterAssets(allAssets, args) {
  let assets = allAssets;
  if (args.only && args.only.length > 0) {
    assets = assets.filter((asset) => args.only.some((needle) => asset.id.includes(needle)));
  }
  if (args.limit !== null) {
    assets = assets.slice(0, args.limit);
  }
  return assets;
}

async function exists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

async function generateImageAsset({ asset, plan, outDir, args, apiBaseUrl, apiKey }) {
  const targetFile = path.join(outDir, `${asset.id}.png`);
  const shouldSkip = !args.force && (await exists(targetFile));
  if (shouldSkip) {
    console.log(`skip image ${asset.id} (exists)`);
    return { id: asset.id, kind: "image", skipped: true, outputs: [targetFile] };
  }

  const imageSize = ensureImageSize(asset.image_size, plan.defaults?.image_size);
  const description = withStyle(plan, asset.description);
  const noBackground = asset.no_background ?? plan.defaults?.no_background ?? true;
  const seed = asset.seed ?? plan.defaults?.seed ?? null;
  const pickIndex = Number.isFinite(asset.pick_index) ? asset.pick_index : 0;
  const keepVariants = Math.max(0, Number(asset.keep_variants ?? 0));

  const body = {
    description,
    image_size: imageSize,
    no_background: noBackground,
    seed,
  };

  if (Array.isArray(asset.reference_images) && asset.reference_images.length > 0) {
    body.reference_images = [];
    for (const ref of asset.reference_images) {
      body.reference_images.push(await buildReferenceObject(ref, outDir));
    }
  }

  if (asset.style_image) {
    body.style_image = await buildReferenceObject(asset.style_image, outDir);
  }

  if (asset.style_options && typeof asset.style_options === "object") {
    body.style_options = asset.style_options;
  }

  if (args.dryRun) {
    console.log(`[dry-run] image ${asset.id}: ${JSON.stringify(body)}`);
    return { id: asset.id, kind: "image", dryRun: true, outputs: [targetFile] };
  }

  const response = await pixellabFetch(apiBaseUrl, apiKey, "/generate-image-v2", "POST", body, args.verbose);
  const imageNodes = extractImageNodes(response);
  if (imageNodes.length === 0) {
    throw new Error(`No images returned for ${asset.id}`);
  }

  const outputs = [];
  if (!args.dryRun) {
    await fs.mkdir(outDir, { recursive: true });
  }
  const chosen = imageNodes[Math.min(pickIndex, imageNodes.length - 1)];
  await writeImageNode(chosen, targetFile);
  outputs.push(targetFile);

  if (keepVariants > 0) {
    const variantsDir = path.join(outDir, "_variants", asset.id);
    await fs.mkdir(variantsDir, { recursive: true });
    const variantCount = Math.min(keepVariants, imageNodes.length);
    for (let i = 0; i < variantCount; i += 1) {
      const variantFile = path.join(variantsDir, `${String(i).padStart(2, "0")}.png`);
      await writeImageNode(imageNodes[i], variantFile);
      outputs.push(variantFile);
    }
  }

  console.log(`ok image ${asset.id} -> ${targetFile}`);
  return {
    id: asset.id,
    kind: "image",
    outputs,
    usage: extractUsage(response),
    variants: imageNodes.length,
    selected: Math.min(pickIndex, imageNodes.length - 1),
  };
}

async function generateAnimationAsset({ asset, plan, outDir, args, apiBaseUrl, apiKey }) {
  const referencePath = asset.reference_path
    ? path.resolve(process.cwd(), asset.reference_path)
    : path.resolve(outDir, `${asset.reference_asset_id}.png`);

  if (!(await exists(referencePath))) {
    throw new Error(`Missing animation reference image for ${asset.id}: ${referencePath}`);
  }

  const imageSize = ensureImageSize(asset.image_size, plan.defaults?.image_size);
  const ref = await readImageAsReference(referencePath);
  const action = withStyle(plan, asset.action);
  const noBackground = asset.no_background ?? plan.defaults?.no_background ?? true;
  const seed = asset.seed ?? plan.defaults?.seed ?? null;

  const body = {
    reference_image: ref.image,
    reference_image_size: asset.reference_image_size ?? ref.size,
    action,
    image_size: imageSize,
    no_background: noBackground,
    seed,
  };

  if (args.dryRun) {
    console.log(`[dry-run] animation ${asset.id}: ${JSON.stringify(body)}`);
    return { id: asset.id, kind: "animation", dryRun: true, outputs: [] };
  }

  const response = await pixellabFetch(apiBaseUrl, apiKey, "/animate-with-text-v2", "POST", body, args.verbose);
  const imageNodes = extractImageNodes(response);
  if (imageNodes.length === 0) {
    throw new Error(`No animation frames returned for ${asset.id}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const outputs = [];
  const framesDir = path.join(outDir, "_animations", asset.id);
  await fs.mkdir(framesDir, { recursive: true });

  for (let i = 0; i < imageNodes.length; i += 1) {
    const frameFile = path.join(framesDir, `${String(i).padStart(2, "0")}.png`);
    await writeImageNode(imageNodes[i], frameFile);
    outputs.push(frameFile);
  }

  if (Array.isArray(asset.frame_targets)) {
    for (const target of asset.frame_targets) {
      if (!target?.id || typeof target.index !== "number") continue;
      if (target.index < 0 || target.index >= imageNodes.length) continue;
      const targetFile = path.join(outDir, `${target.id}.png`);
      if (!args.force && (await exists(targetFile))) {
        console.log(`skip frame target ${target.id} (exists)`);
        continue;
      }
      await writeImageNode(imageNodes[target.index], targetFile);
      outputs.push(targetFile);
    }
  }

  console.log(`ok animation ${asset.id} -> ${framesDir}`);
  return {
    id: asset.id,
    kind: "animation",
    outputs,
    usage: extractUsage(response),
    frames: imageNodes.length,
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const apiKey = await readEnvApiKey();
  if (!apiKey) {
    throw new Error("PIXELLAB_API_KEY not found in process env or .env");
  }

  const planPath = path.resolve(process.cwd(), args.plan);
  const outDir = path.resolve(process.cwd(), args.outDir);
  const planRaw = await fs.readFile(planPath, "utf8");
  const plan = JSON.parse(planRaw);
  const apiBaseUrl = (plan.api_base_url ?? process.env.PIXELLAB_API_BASE_URL ?? DEFAULT_API_BASE).replace(/\/+$/, "");

  if (!Array.isArray(plan.assets) || plan.assets.length === 0) {
    throw new Error(`No assets found in plan: ${planPath}`);
  }

  await fs.mkdir(outDir, { recursive: true });
  const selectedAssets = filterAssets(plan.assets, args);
  if (selectedAssets.length === 0) {
    console.log("No assets matched filters");
    return;
  }

  if (!args.skipBalance && !args.dryRun) {
    try {
      const balance = await pixellabFetch(apiBaseUrl, apiKey, "/balance", "GET", null, args.verbose);
      console.log(`balance: ${JSON.stringify(balance)}`);
    } catch (error) {
      console.warn(`balance check failed: ${error.message}`);
    }
  }

  const manifest = {
    generated_at: new Date().toISOString(),
    plan: path.relative(process.cwd(), planPath),
    out_dir: path.relative(process.cwd(), outDir),
    assets: [],
  };

  for (const asset of selectedAssets) {
    if (!asset?.id || typeof asset.id !== "string") {
      throw new Error(`Asset is missing id: ${JSON.stringify(asset)}`);
    }
    if (!asset?.kind || (asset.kind !== "image" && asset.kind !== "animation")) {
      throw new Error(`Asset kind must be "image" or "animation": ${asset.id}`);
    }

    if (asset.kind === "image") {
      const result = await generateImageAsset({ asset, plan, outDir, args, apiBaseUrl, apiKey });
      manifest.assets.push(result);
      continue;
    }

    const result = await generateAnimationAsset({ asset, plan, outDir, args, apiBaseUrl, apiKey });
    manifest.assets.push(result);
  }

  if (args.dryRun) {
    console.log(`dry-run complete (${manifest.assets.length} assets)`);
    return;
  }

  const manifestPath = path.join(outDir, "manifest.json");
  await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`manifest written: ${manifestPath}`);
}

main().catch((error) => {
  console.error(`pixellab generation failed: ${error.message}`);
  process.exit(1);
});
