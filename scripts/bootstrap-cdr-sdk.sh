#!/usr/bin/env bash
# Clones and builds @piplabs/cdr-sdk into a sibling directory so the
# workspace can install it via `file:` reference.
#
# Usage: ./scripts/bootstrap-cdr-sdk.sh

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PARENT_DIR="$(cd "$ROOT_DIR/.." && pwd)"
SDK_DIR="$PARENT_DIR/cdr-sdk"
SDK_BRANCH="0.1.1"

if [ -d "$SDK_DIR" ]; then
  echo "cdr-sdk already cloned at $SDK_DIR — skipping clone."
else
  echo "Cloning piplabs/cdr-sdk@$SDK_BRANCH into $SDK_DIR"
  git clone https://github.com/piplabs/cdr-sdk.git --branch "$SDK_BRANCH" --depth 1 "$SDK_DIR"
fi

echo "Building cdr-sdk..."
cd "$SDK_DIR"
pnpm install
pnpm build

echo "Packing cdr-sdk subpackages into tarballs (workspace:* deps need this)..."
cd "$SDK_DIR/packages/sdk" && pnpm pack >/dev/null
cd "$SDK_DIR/packages/contracts" && pnpm pack >/dev/null
cd "$SDK_DIR/packages/crypto" && pnpm pack >/dev/null

echo ""
echo "✓ cdr-sdk built + packed at $SDK_DIR/packages/{sdk,contracts,crypto}/*.tgz"
echo "  Workspace references them via pnpm.overrides in root package.json."
