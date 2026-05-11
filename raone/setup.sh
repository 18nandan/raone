#!/usr/bin/env bash
set -euo pipefail

EXPECTED_BUN_VERSION="1.3.11"

if ! command -v bun &>/dev/null; then
  curl -fsSL https://bun.sh/install | bash -s "bun-v${EXPECTED_BUN_VERSION}"
  export PATH="${HOME}/.bun/bin:${PATH}"
fi

for dir in cli gateway assistant credential-executor; do
  cd "$dir" && bun install && bun link && cd ..
done

for dir in packages/*/; do
  [ -f "${dir}/package.json" ] && cd "$dir" && bun install && cd ../..
done

for dir in skills/*/; do
  [ -f "${dir}/package.json" ] && cd "$dir" && bun install && cd ../..
done

cd meta && bun link @raoneai/cli @raoneai/assistant @raoneai/gateway @raoneai/credential-executor
bun link

echo "Done. Run: raone --version"
