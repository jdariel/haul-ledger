#!/usr/bin/env bash
set -euo pipefail

# EAS runs build commands from the monorepo root, but expo prebuild
# places the generated ios/ directory inside artifacts/mobile/ios/.
# This hook runs after `pnpm install` but before expo prebuild + pod install.
#
# We run expo prebuild here from the correct directory, then create a
# symlink at the repo root so EAS can find ./ios/Podfile for pod install.

echo "==> EAS post-install hook: running expo prebuild in artifacts/mobile"
cd artifacts/mobile
./node_modules/.bin/expo prebuild --no-install --platform ios
cd -

echo "==> Creating ./ios symlink -> artifacts/mobile/ios for pod install"
ln -sfn "$(pwd)/artifacts/mobile/ios" "$(pwd)/ios"
echo "==> Done. ./ios -> $(readlink ios)"
