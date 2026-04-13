#!/bin/bash
# release_app.sh

set -euo pipefail

APP_NAME="LanTalk"
BINARY="lantalk"
ICNS_FILE="icons/AppIcon.icns"
VERSION="1.0.0"
BUILD_NUM="1"
GOOS=darwin
DIST_DIR="dist"
STAGING_DIR="dist/_staging"

START_TIME=$(date +%s)

# 清理旧产物
rm -rf "$DIST_DIR"
mkdir -p "$DIST_DIR"

# 编译 arm64
CGO_ENABLED=1 GOOS=$GOOS GOARCH=arm64 go build -tags systray -ldflags "-s -w" -o "$DIST_DIR/${BINARY}_arm64"

# 编译 amd64
CGO_ENABLED=1 GOOS=$GOOS GOARCH=amd64 go build -tags systray -ldflags "-s -w" -o "$DIST_DIR/${BINARY}_amd64"

# 合并 Universal Binary
lipo -create -output "$DIST_DIR/$BINARY" \
  "$DIST_DIR/${BINARY}_arm64" \
  "$DIST_DIR/${BINARY}_amd64"

# 清理单架构产物
rm "$DIST_DIR/${BINARY}_arm64" "$DIST_DIR/${BINARY}_amd64"

# 创建 .app 目录结构
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

# 创建 DMG
mkdir -p "$STAGING_DIR"
cp -r "$DIST_DIR/$APP_NAME.app" "$STAGING_DIR/"
ln -s /Applications "$STAGING_DIR/Applications"

hdiutil create -volname "$APP_NAME" \
  -srcfolder "$STAGING_DIR" \
  -ov -format UDZO -quiet \
  -o "$DIST_DIR/$APP_NAME-$VERSION.dmg"

rm -rf "$STAGING_DIR"

END_TIME=$(date +%s)
ELAPSED=$((END_TIME - START_TIME))

echo "✅ Done: $DIST_DIR/$APP_NAME-$VERSION.dmg (v$VERSION, build $BUILD_NUM, $GOOS/universal) in ${ELAPSED}s"