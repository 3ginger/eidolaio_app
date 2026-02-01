# Eidola iOS App Build Guide

This document describes how to build and deploy the Eidola iOS app.

## Prerequisites

- Node.js 18+ and npm
- Xcode 15+ (with iOS 17+ SDK)
- Apple Developer account (for device testing and App Store deployment)
- CocoaPods (optional, used by some plugins)

## Quick Start

```bash
cd client

# Install dependencies (if not already done)
npm install

# Build web app and sync with iOS
npm run ios:sync

# Open in Xcode
npm run ios:open
```

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run ios:sync` | Build web app and sync with iOS project |
| `npm run ios:open` | Open iOS project in Xcode |
| `npm run ios:run` | Build and run on connected device/simulator |
| `npm run ios:build` | Build, sync, and open Xcode in one command |

## Project Structure

```
client/
├── ios/                      # iOS native project
│   └── App/
│       ├── App/
│       │   ├── Assets.xcassets/  # App icons and splash screen
│       │   ├── Info.plist        # iOS permissions and config
│       │   └── public/           # Built web assets (synced)
│       ├── App.xcodeproj         # Xcode project file
│       └── Podfile               # CocoaPods dependencies
├── capacitor.config.ts       # Capacitor configuration
├── package.json              # npm scripts
└── dist/                     # Built web assets (source)
```

## Configuration

### Capacitor Config (`capacitor.config.ts`)

The main configuration file controls:
- **App ID**: `io.eidola.app`
- **App Name**: `Eidola`
- **Web Dir**: `dist` (built output)
- **Plugins**: SplashScreen, StatusBar, Camera, Geolocation

### iOS Permissions (`ios/App/App/Info.plist`)

The following permissions are configured:

| Permission | Description |
|------------|-------------|
| `NSCameraUsageDescription` | Camera access for capturing photos |
| `NSPhotoLibraryUsageDescription` | Photo library access for selecting images |
| `NSPhotoLibraryAddUsageDescription` | Save photos to library |
| `NSLocationWhenInUseUsageDescription` | Location for geotagging posts |

## Building for Simulator

### Option 1: Command Line (Recommended)

```bash
cd ~/projects/pareidolia-app/client

# First, sync the web build
npm run ios:sync

# Then build with xcodebuild
cd ios/App
xcodebuild -workspace App.xcworkspace -scheme App \
  -destination "platform=iOS Simulator,name=iPhone 17 Pro" \
  -configuration Debug build
```

The built app will be in:
`~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app`

To run in simulator after build:
```bash
# Boot simulator if needed
xcrun simctl boot "iPhone 17 Pro"

# Install and launch
xcrun simctl install booted ~/Library/Developer/Xcode/DerivedData/App-*/Build/Products/Debug-iphonesimulator/App.app
xcrun simctl launch booted io.eidola.app
```

### Option 2: Xcode GUI

1. Run `npm run ios:open` to open Xcode
2. Select a simulator device from the dropdown (e.g., "iPhone 17 Pro")
3. Press Cmd+R or click the Play button to build and run

> **Note**: The Capacitor CLI (`npx cap run ios`) may have issues selecting simulators. Use xcodebuild directly for reliable command-line builds.

## Building for Device

1. Connect your iOS device
2. Open Xcode with `npm run ios:open`
3. Select your device from the dropdown
4. You may need to:
   - Sign in with your Apple ID (Xcode > Settings > Accounts)
   - Select a development team in the project settings
   - Trust the developer certificate on your device

## App Store Deployment

### 1. Prepare for Release

1. Update version numbers in Xcode:
   - Select "App" target
   - General > Identity > Version and Build

2. Create app icons (if not already done):
   - Icons are in `ios/App/App/Assets.xcassets/AppIcon.appiconset/`
   - 1024x1024 is required for App Store

3. Update splash screen if needed:
   - Located in `ios/App/App/Assets.xcassets/Splash.imageset/`

### 2. Archive and Upload

1. In Xcode, select "Any iOS Device" as target
2. Product > Archive
3. In Organizer, click "Distribute App"
4. Choose "App Store Connect"
5. Follow prompts to upload

### 3. App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Create new app with bundle ID `io.eidola.app`
3. Fill in app metadata, screenshots, etc.
4. Submit for review

## Troubleshooting

### "Browser not installed" Error
Run `npm run ios:install` or use Xcode to run on a real device.

### Plugin Not Found
Make sure to run `npm run ios:sync` after installing new plugins.

### White Screen on Launch
Check that the web build completed successfully:
```bash
npm run build
ls dist/
```

### Permissions Not Working
Verify Info.plist contains the required permission descriptions.

### Changes Not Appearing
After code changes, always run:
```bash
npm run ios:sync
```

## Development Workflow

1. Make changes to React code in `src/`
2. Test in browser with `npm run dev`
3. Build and sync: `npm run ios:sync`
4. Test in Xcode simulator
5. Test on real device before release

## Plugin Documentation

- [Capacitor Camera](https://capacitorjs.com/docs/apis/camera)
- [Capacitor Geolocation](https://capacitorjs.com/docs/apis/geolocation)
- [Capacitor Status Bar](https://capacitorjs.com/docs/apis/status-bar)
- [Capacitor Splash Screen](https://capacitorjs.com/docs/apis/splash-screen)

## Theme Colors

The app uses these brand colors:
- Background: `#f8f6f3` (cream)
- Primary: `#ff8c42` (orange)
- Accent: `#9b59b6` (magenta)

These are configured in the splash screen and status bar.
