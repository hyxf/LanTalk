#!/bin/bash
# build-app.sh

APP_NAME="LanTalk"
BINARY="lantalk"

# 编译
go build -ldflags="-s -w" -o $BINARY main_systray.go main.go client.go hub.go message.go

# 创建 App Bundle
mkdir -p $APP_NAME.app/Contents/MacOS
mkdir -p $APP_NAME.app/Contents/Resources

# 复制可执行文件
cp $BINARY $APP_NAME.app/Contents/MacOS/

# 创建 Info.plist
cat > $APP_NAME.app/Contents/Info.plist << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>lantalk</string>
    <key>CFBundleIdentifier</key>
    <string>com.lantalk.app</string>
    <key>CFBundleName</key>
    <string>LanTalk</string>
    <key>NSHighResolutionCapable</key>
    <true/>
    <key>LSUIElement</key>
    <true/>
</dict>
</plist>
EOF

echo "App Bundle created: $APP_NAME.app"
open $APP_NAME.app
