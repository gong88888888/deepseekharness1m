#!/usr/bin/env sh
set -eu
cd "$(dirname "$0")"
node -e 'const [M,m]=process.versions.node.split(".").map(Number); if (!((M===22&&m>=19)||M>=24)) { console.error(`Unsupported Node.js ${process.versions.node}; install Node.js 22.19+ or 24+.`); process.exit(1) }'
if ! command -v pnpm >/dev/null 2>&1; then
  echo 'pnpm 11.7.0 is required. Run: corepack enable && corepack prepare pnpm@11.7.0 --activate' >&2
  exit 1
fi
if [ "$(pnpm --version)" != '11.7.0' ]; then
  echo "Unsupported pnpm $(pnpm --version); install pnpm 11.7.0." >&2
  exit 1
fi
pnpm install --frozen-lockfile
pnpm run build
echo 'Build complete. Start with: pnpm dsh web'
