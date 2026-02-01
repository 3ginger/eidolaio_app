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

## Code Signing and TestFlight Deployment

### Prerequisites for App Store / TestFlight

- **Apple Developer Account** (paid, $99/year)
- **Bundle ID registered** in Apple Developer portal: `io.eidola.app`
- **App created** in App Store Connect

### Step-by-Step Signing Instructions

#### 1. Open Xcode

From the terminal in the `client/` directory:
```bash
npm run ios:open
```

This opens the Xcode workspace at `ios/App/App.xcworkspace`.

#### 2. Sign in to Apple Developer Account

1. In Xcode menu bar, go to **Xcode > Settings** (or press `Cmd + ,`)
2. Click the **Accounts** tab
3. Click the **+** button in the bottom left
4. Choose **Apple ID** and sign in with your Apple Developer account credentials
5. Once signed in, you should see your account listed with your team name below it
6. Close the Settings window

#### 3. Configure Project Signing

1. In the left sidebar (Project Navigator), click the **blue "App" icon** at the very top
2. Make sure the **"App" target** is selected under "TARGETS" (not the project under "PROJECT")
3. Click the **"Signing & Capabilities"** tab at the top of the main editor area
4. Under **"Team"**, click the dropdown and select your Apple Developer team
   - If you don't see your team, make sure you completed step 2
5. Check that **"Automatically manage signing"** is enabled (should have a checkmark)
6. Verify the **Bundle Identifier** is `io.eidola.app`
7. Xcode will automatically create a provisioning profile. You should see:
   - ✓ **Signing Certificate**: "Apple Distribution: [Your Name]"
   - ✓ **Provisioning Profile**: "Xcode Managed Profile"

If you see any errors:
- Make sure `io.eidola.app` is registered in your Apple Developer account
- Try toggling "Automatically manage signing" off and back on
- Check that your Apple Developer account is in good standing

#### 4. Verify Version and Build Numbers

Current settings (already configured):
- **Version**: 1.0.0 (shown as "1.0" in MARKETING_VERSION)
- **Build**: 1 (shown in CURRENT_PROJECT_VERSION)

To change these later:
1. Select the **App target**
2. Go to **General** tab
3. Find the **Identity** section
4. Update **Version** (e.g., 1.0.0) and **Build** (e.g., 1)

> **Note**: Each TestFlight upload must have a unique build number. Increment the build for each submission.

### Archiving and Uploading to TestFlight

#### 1. Select Build Destination

In the Xcode toolbar (top left), click the device dropdown and select:
**"Any iOS Device (arm64)"**

> Do NOT select a specific device or simulator

#### 2. Create Archive

1. In the menu bar: **Product > Archive**
2. Wait for the build to complete (may take 1-2 minutes)
3. The **Organizer** window will open automatically showing your archive

If you see build errors:
- Make sure signing is configured correctly (step 3 above)
- Check that you selected "Any iOS Device" not a simulator

#### 3. Distribute to TestFlight

In the Organizer window:

1. Your new archive should be selected. Click **"Distribute App"**
2. Choose **"App Store Connect"** and click **Next**
3. Choose **"Upload"** and click **Next**
4. Select signing options:
   - ✓ **"Automatically manage signing"** (recommended)
   - Click **Next**
5. Review the app information and click **Upload**
6. Wait for the upload to complete

You'll see "Upload Successful" when done.

#### 4. TestFlight Processing

1. Go to [App Store Connect](https://appstoreconnect.apple.com)
2. Select your **Eidola** app
3. Go to **TestFlight** tab
4. Under **iOS**, you'll see your build with status **"Processing"**
   - This can take 5-15 minutes
   - You'll get an email when processing is complete
5. Once processing is done, the build status will be **"Ready to Submit"**
   - You may need to fill out **Export Compliance** information:
     - Does your app use encryption? → Usually "No" for standard HTTPS apps
6. Add **internal or external testers** to start testing

### Troubleshooting Signing Issues

#### "Failed to create provisioning profile"
- Verify `io.eidola.app` is registered in your Apple Developer account at [developer.apple.com](https://developer.apple.com/account/resources/identifiers/list)
- Make sure your Apple Developer account membership is active

#### "No signing certificate found"
- Go to Xcode > Settings > Accounts
- Select your account and click **"Manage Certificates..."**
- Click **+** and choose **"Apple Distribution"**

#### "The bundle identifier is already in use"
- Make sure you're signed in with the correct Apple ID that owns this bundle ID
- If someone else owns it, you'll need to use a different bundle ID

#### "This build is invalid"
- Check that your version/build number hasn't been used before
- Increment the build number and try again

## Automated TestFlight Deployment with Fastlane

For automated builds and uploads, use the fastlane setup in `ios/App/fastlane/`.

### Initial Setup

Run the interactive setup script:
```bash
cd client/ios/App/fastlane
./setup_testflight.sh
```

This will:
1. Configure your Apple Developer Team ID
2. Set up App Store Connect API key
3. Update project signing configuration

### Fastlane Lanes

| Command | Description |
|---------|-------------|
| `fastlane build` | Build the app for TestFlight (no upload) |
| `fastlane beta` | Build and upload to TestFlight |
| `fastlane upload` | Upload existing IPA to TestFlight |
| `fastlane release` | Sync web app, build, and upload |
| `fastlane check_signing` | Verify signing configuration |

### Quick Deployment

```bash
# From client directory
npm run ios:sync

# From fastlane directory
cd ios/App/fastlane
fastlane beta
```

### Environment Variables

If you prefer environment variables over the API key file:
```bash
export TEAM_ID="YOUR_TEAM_ID"
export ASC_KEY_ID="YOUR_KEY_ID"
export ASC_ISSUER_ID="YOUR_ISSUER_ID"
```

## App Store Deployment (After TestFlight)

### 1. Prepare Store Listing

In [App Store Connect](https://appstoreconnect.apple.com):

1. Create app metadata:
   - App name, subtitle, description
   - Keywords for search
   - Support URL and privacy policy URL
   - App category (Social Networking or Photo & Video)

2. Upload screenshots (required sizes):
   - 6.5" display (iPhone 14 Pro Max): 1290 x 2796 px
   - 5.5" display (iPhone 8 Plus): 1242 x 2208 px

3. Upload app icon:
   - 1024x1024 px (already created in Assets.xcassets)
   - Xcode will automatically include this

4. Add age rating and content information

### 2. Submit for Review

1. Select a TestFlight build for release
2. Choose manual or automatic release
3. Fill in review notes if needed
4. Click **"Submit for Review"**
5. Review typically takes 24-48 hours

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
