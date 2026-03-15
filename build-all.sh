#!/usr/bin/env bash
# build-all.sh — cross-compile LanTalk server for all major platforms
# Run AFTER build.sh has already copied dist/ to server/static/
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/server"

go mod download

targets=(
  "linux   amd64  lantalk-server-linux-amd64"
  "linux   arm64  lantalk-server-linux-arm64"
  "darwin  amd64  lantalk-server-macos-amd64"
  "darwin  arm64  lantalk-server-macos-arm64"
  "windows amd64  lantalk-server-windows-amd64.exe"
)

mkdir -p ../dist-bin

for t in "${targets[@]}"; do
  read -r goos goarch outname <<< "$t"
  echo "  Building $outname ..."
  GOOS=$goos GOARCH=$goarch go build -ldflags="-s -w" -o "../dist-bin/$outname" .
done

echo ""
echo "✅ All binaries in dist-bin/:"
ls -lh ../dist-bin/
