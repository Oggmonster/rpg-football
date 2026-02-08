# PixelLab Asset Pipeline

This project now supports generating and consuming PixelLab assets for:

- Pitch and goals
- Player states (`idle`, `run_a`, `run_b`, `kick`, `tackle`, `save`)
- Ball states (`ball_idle`, `ball_flight`, `ball_shot`)
- Extra animation cycles for dribble and ball motion

The style/prompt plan is in `scripts/pixellab.asset-plan.json`, aligned with `docs/make_it_fun/j. The Full Art Bible.md`.

## 1) Generate assets

Run all assets:

```bash
npm run assets:pixellab
```

Useful filters while iterating:

```bash
node scripts/generate-pixellab-assets.mjs --only pitch,goal
node scripts/generate-pixellab-assets.mjs --only player_home --limit 5
node scripts/generate-pixellab-assets.mjs --dry-run --only ball
```

Options:

- `--force`: overwrite existing png files
- `--out <dir>`: write to a custom folder
- `--skip-balance`: skip the `GET /balance` pre-check
- `--verbose`: print endpoint-level debug logs

## 2) Output location

Generated files are written to:

- `public/assets/pixellab/*.png`
- `public/assets/pixellab/_variants/*`
- `public/assets/pixellab/_animations/*`
- `public/assets/pixellab/manifest.json`

## 3) Runtime behavior in game

`PreloadScene` now tries to load textures from `public/assets/pixellab`.

- If a generated texture exists, the game uses it.
- If it does not exist, the old procedural fallback texture is generated and used.

This keeps gameplay iteration safe even if only some assets are generated.

## 4) Notes on API responses

The generator handles current v2 response shapes from `https://api.pixellab.ai/v2/openapi.json`:

- `POST /generate-image-v2` -> `images[]`
- `POST /animate-with-text-v2` -> `images[]`
- Base64 image payloads in `data:image/png;base64,...` format

## 5) If generation fails with insufficient resources

PixelLab can return:

- `402` or detail similar to `Insufficient resources. Remaining: 0`

When this happens, top up or switch to an account/key with available generations, then rerun the command.
