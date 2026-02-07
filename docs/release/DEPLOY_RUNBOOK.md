# Deploy Runbook (Browser Build)

## Local Verification
1. Install dependencies: `npm ci`
2. Run tests: `npm run test`
3. Build: `npm run build`
4. Smoke test preview: `npm run preview`

## Artifact
- Output folder: `dist/`
- Upload `dist/` contents to static host (Netlify, Vercel static output, Cloudflare Pages, S3+CloudFront, etc.)

## Post-Deploy Check
1. Open site on desktop + mobile viewport
2. Verify menu navigation (Quick Match / Deck Builder / Collection)
3. Start Quick Match and play at least one goal + restart cycle
4. Confirm localStorage profile persists deck/squad after refresh
