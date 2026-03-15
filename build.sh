#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

echo "==> [1/4] Installing frontend dependencies..."
npm install

echo "==> [2/4] Building frontend..."
npm run build

echo "==> [3/4] Copying dist to server/static..."
rm -rf server/static/*
cp -r dist/* server/static/

echo "==> [4/4] Building Go binary..."
cd server

go mod download

mkdir -p ../dist-bin
go build -ldflags="-s -w" -o ../dist-bin/lantalk .

cd ..

echo ""
echo "✅ Build complete! Run with:"
echo "   ./dist-bin/lantalk"
echo ""
echo "   Optional: set PORT env var to change port (default 3000)"
echo "   PORT=8080 ./dist-bin/lantalk"