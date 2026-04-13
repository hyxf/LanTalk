#!/bin/bash
# release_cli.sh

set -euo pipefail

BINARY="lantalk"
GOOS=darwin
DIST_DIR="dist-bin"

START_TIME=$(date +%s)

# 清理旧产物
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 编译 arm64
CGO_ENABLED=1 GOOS=$GOOS GOARCH=arm64 go build -ldflags "-s -w" -o "$DIST_DIR/${BINARY}_arm64"

# 编译 amd64
CGO_ENABLED=1 GOOS=$GOOS GOARCH=amd64 go build -ldflags "-s -w" -o "$DIST_DIR/${BINARY}_amd64"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "✅ Done: $DIST_DIR/${BINARY}_arm64, $DIST_DIR/${BINARY}_amd64 ($GOOS) in ${ELAPSED}s"