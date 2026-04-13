#!/bin/bash
# build-app.sh

APP_NAME="LanTalk"
BINARY="lantalk"
ICNS_FILE="icons/AppIcon.icns"
VERSION="1.0.0"
BUILD_NUM="1"

# 编译
go build -o $BINARY

# 创建目录结构
mkdir -p $APP_NAME.app/Contents/MacOS
mkdir -p $APP_NAME.app/Contents/Resources

# 复制文件
cp $BINARY $APP_NAME.app/Contents/MacOS/
cp $ICNS_FILE $APP_NAME.app/Contents/Resources/

# 创建 Info.plist
cat > $APP_NAME.app/Contents/Info.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleName</key>
    <string>LanTalk</string>
    
    <key>CFBundleDisplayName</key>
    <string>LanTalk</string>
    
    <key>CFBundleIdentifier</key>
    <string>com.lantalk.app</string>
    
    <key>CFBundleExecutable</key>
    <string>lantalk</string>
    
    <key>CFBundleIconFile</key>
    <string>AppIcon</string>
    
    <key>CFBundlePackageType</key>
    <string>APPL</string>
    
    <key>CFBundleShortVersionString</key>
    <string>1.0.0</string>
    
    <key>CFBundleVersion</key>
    <string>1</string>
    
    <key>LSMinimumSystemVersion</key>
    <string>10.15</string>
    
    <key>NSHumanReadableCopyright</key>
    <string>Copyright © 2024 LanTalk. All rights reserved.</string>
    
    <key>NSHighResolutionCapable</key>
    <true/>
    
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

echo "✅ Done: $APP_NAME.app (v$VERSION)"
