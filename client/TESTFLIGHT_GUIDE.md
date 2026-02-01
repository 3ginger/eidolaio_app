# Eidola TestFlight Submission Guide

Step-by-step guide to upload Eidola to TestFlight for beta testing.

## Prerequisites

- [x] Apple Developer Program membership ($99/year) - https://developer.apple.com/programs/
- [x] Xcode 15+ installed
- [x] App icon 1024x1024 ✓ (already in place)
- [x] Info.plist permissions configured ✓

## Current App Configuration

| Setting | Value |
|---------|-------|
| Bundle ID | `io.eidola.app` |
| Display Name | Eidola |
| Version | 1.0 |
| Build | 1 |

## Step 1: Create App in App Store Connect

1. Go to https://appstoreconnect.apple.com
2. Click **My Apps** → **+** → **New App**
3. Fill in:
   - **Platform**: iOS
   - **Name**: Eidola
   - **Primary Language**: English (U.S.)
   - **Bundle ID**: Select `io.eidola.app` (must match Xcode)
   - **SKU**: `eidola-ios-001` (any unique identifier)
4. Click **Create**

## Step 2: Sync and Build Web Assets

```bash
cd ~/projects/pareidolia-app/client

# Ensure latest web build is synced
npm run ios:sync
```

## Step 3: Configure Signing in Xcode

1. Open Xcode:
   ```bash
   npm run ios:open
   ```

2. Select **App** in the project navigator (left sidebar)

3. Select **App** target → **Signing & Capabilities** tab

4. Check **Automatically manage signing**

5. Select your **Team** (your Apple Developer account)

6. Xcode will create/download provisioning profiles automatically

## Step 4: Set Version Numbers (if updating)

For subsequent builds, increment the build number:

1. Select **App** target → **General** tab
2. Under **Identity**:
   - **Version**: 1.0 (user-visible, change for significant updates)
   - **Build**: Increment for each TestFlight upload (1, 2, 3...)

> **Important**: Each TestFlight upload needs a unique build number. Version can stay the same.

## Step 5: Archive the App

1. In Xcode, select **Any iOS Device (arm64)** from the device dropdown (not a simulator)

2. Menu: **Product** → **Archive**

3. Wait for build to complete (may take a few minutes)

4. **Organizer** window opens automatically when done

## Step 6: Upload to App Store Connect

1. In **Organizer** (Window → Organizer if not open):
   - Select the latest archive
   - Click **Distribute App**

2. Select **App Store Connect** → **Next**

3. Select **Upload** → **Next**

4. Keep default options:
   - [x] Upload your app's symbols
   - [x] Manage Version and Build Number
   - Click **Next**

5. Select signing certificate (usually auto-selected) → **Next**

6. Review summary → **Upload**

7. Wait for upload to complete

## Step 7: Complete TestFlight Setup

1. Go to https://appstoreconnect.apple.com → **My Apps** → **Eidola**

2. Click **TestFlight** tab

3. Wait for build to appear (may take 5-15 minutes for processing)

4. Once build shows, click on it:
   - Add **Export Compliance** info (select "No" if no encryption beyond HTTPS)
   - Add **Test Information** (what to test, login credentials if needed)

## Step 8: Add Testers

### Internal Testers (immediate access, up to 100)
1. **TestFlight** → **Internal Testing** → **App Store Connect Users**
2. Click **+** to add testers from your team
3. They receive invite immediately

### External Testers (requires Beta App Review first time)
1. **TestFlight** → **External Testing** → **+** button
2. Create a group (e.g., "Beta Testers")
3. Add testers by email
4. Submit for **Beta App Review** (usually approved within 24-48 hours)

## Troubleshooting

### "No accounts with App Store Connect access"
- Ensure your Apple ID is enrolled in Apple Developer Program
- In Xcode: **Settings** → **Accounts** → Add your Apple ID

### "No signing certificate"
1. Xcode → **Settings** → **Accounts**
2. Select your team → **Manage Certificates**
3. Click **+** → **Apple Distribution**

### Archive option is greyed out
- Make sure **Any iOS Device (arm64)** is selected, not a simulator

### Build rejected for missing compliance info
- In App Store Connect → TestFlight → click on the build
- Complete the Export Compliance questionnaire

### "Invalid Bundle" error
- Verify Bundle ID matches exactly: `io.eidola.app`
- Ensure version/build are valid (no special characters)

## Quick Reference: Updating After Code Changes

```bash
# 1. Build and sync web assets
cd ~/projects/pareidolia-app/client
npm run ios:sync

# 2. Open Xcode
npm run ios:open

# 3. Increment Build number in General → Identity

# 4. Archive: Product → Archive

# 5. Upload: Distribute App → App Store Connect → Upload
```

## TestFlight Link

Once your first build is processed and approved, you'll get a public TestFlight link:
```
https://testflight.apple.com/join/XXXXXXXX
```

Share this link to invite anyone to test (up to 10,000 external testers).
