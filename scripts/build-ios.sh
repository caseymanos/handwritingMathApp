#!/bin/bash

# iOS Build Automation Script
# Builds release IPA for iOS app

set -e  # Exit on error

echo "🚀 Starting iOS build process..."

# Configuration
APP_NAME="handwritingMathApp"
WORKSPACE="ios/${APP_NAME}.xcworkspace"
SCHEME="${APP_NAME}"
CONFIGURATION="Release"
ARCHIVE_PATH="./ios/build/${APP_NAME}.xcarchive"
EXPORT_PATH="./ios/build"
EXPORT_OPTIONS="./ios/ExportOptions.plist"

# Color codes for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."

if ! command -v xcodebuild &> /dev/null; then
    echo -e "${RED}❌ xcodebuild not found. Please install Xcode.${NC}"
    exit 1
fi

if ! command -v pod &> /dev/null; then
    echo -e "${YELLOW}⚠️  CocoaPods not found. Installing...${NC}"
    sudo gem install cocoapods
fi

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf ios/build
rm -rf ~/Library/Developer/Xcode/DerivedData/${APP_NAME}-*

# Install CocoaPods dependencies
echo "📦 Installing CocoaPods dependencies..."
cd ios
pod install
cd ..

# Archive the app
echo "📦 Archiving app..."
xcodebuild archive \
    -workspace "${WORKSPACE}" \
    -scheme "${SCHEME}" \
    -configuration "${CONFIGURATION}" \
    -archivePath "${ARCHIVE_PATH}" \
    -allowProvisioningUpdates \
    CODE_SIGN_STYLE=Automatic \
    | xcpretty || exit 1

# Check if ExportOptions.plist exists
if [ ! -f "${EXPORT_OPTIONS}" ]; then
    echo -e "${YELLOW}⚠️  ExportOptions.plist not found. Creating default...${NC}"
    cat > "${EXPORT_OPTIONS}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string>
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string>
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
</dict>
</plist>
EOF
    echo -e "${RED}❌ Please update ${EXPORT_OPTIONS} with your Team ID${NC}"
    exit 1
fi

# Export IPA
echo "📤 Exporting IPA..."
xcodebuild -exportArchive \
    -archivePath "${ARCHIVE_PATH}" \
    -exportPath "${EXPORT_PATH}" \
    -exportOptionsPlist "${EXPORT_OPTIONS}" \
    -allowProvisioningUpdates \
    | xcpretty || exit 1

echo -e "${GREEN}✅ Build complete!${NC}"
echo -e "IPA location: ${EXPORT_PATH}/${APP_NAME}.ipa"

# Optional: Upload to TestFlight (requires fastlane)
read -p "Upload to TestFlight? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    if command -v fastlane &> /dev/null; then
        echo "🚀 Uploading to TestFlight..."
        cd ios
        fastlane pilot upload --ipa "build/${APP_NAME}.ipa"
        cd ..
        echo -e "${GREEN}✅ Upload complete!${NC}"
    else
        echo -e "${RED}❌ Fastlane not found. Install with: gem install fastlane${NC}"
    fi
fi

echo "🎉 Done!"
