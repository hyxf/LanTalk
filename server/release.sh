#!/bin/bash
# release.sh

set -euo pipefail

APP_NAME="LanTalk"
BINARY="lantalk"
ICNS_FILE="icons/AppIcon.icns"
VERSION="1.0.0"
BUILD_NUM="1"
GOOS=darwin
GOARCH="${GOARCH:-arm64}"
DIST_DIR="dist"

# 清理旧产物
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 编译
GOOS=$GOOS GOARCH=$GOARCH go build -tags systray -ldflags "-s -w" -o "$DIST_DIR/$BINARY"

# 创建目录结构
mkdir -p "$DIST_DIR/$APP_NAME.app/Contents/MacOS"
mkdir -p "$DIST_DIR/$APP_NAME.app/Contents/Resources"

# 复制文件
cp "$DIST_DIR/$BINARY" "$DIST_DIR/$APP_NAME.app/Contents/MacOS/"
cp "$ICNS_FILE" "$DIST_DIR/$APP_NAME.app/Contents/Resources/"

# 创建 Info.plist
cat > "$DIST_DIR/$APP_NAME.app/Contents/Info.plist" << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>LanTalk</string>

    <key>CFBundleDisplayName</key>
    <string>LanTalk</string>

    <key>CFBundleIdentifier</key>
    <string>bill.chiu.lantalk.app</string>

    <key>CFBundleExecutable</key>
    <string>lantalk</string>

    <key>CFBundleIconFile</key>
    <string>AppIcon</string>

    <key>CFBundlePackageType</key>
    <string>APPL</string>

    <key>CFBundleShortVersionString</key>
    <string>$VERSION</string>

    <key>CFBundleVersion</key>
    <string>$BUILD_NUM</string>

    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>

    <key>NSHumanReadableCopyright</key>
    <string>Copyright © $(date +%Y) LanTalk. All rights reserved.</string>

    <key>NSHighResolutionCapable</key>
    <true/>

    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ Done: $DIST_DIR/$APP_NAME.app (v$VERSION, build $BUILD_NUM, $GOOS/$GOARCH)"