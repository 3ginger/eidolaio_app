#!/bin/bash
# TestFlight Setup Script for Eidola iOS App
# Run this script to configure your Apple Developer account for TestFlight

set -e

echo "🍎 Eidola iOS TestFlight Setup"
echo "================================"
echo ""

# Check for required tools
if ! command -v xcrun &> /dev/null; then
    echo "❌ Xcode Command Line Tools not found. Install with: xcode-select --install"
    exit 1
fi

# Step 1: Get Team ID
echo "📋 Step 1: Finding your Apple Developer Team ID..."
echo ""
echo "Your Apple Developer Team ID is needed for signing."
echo ""
echo "To find it:"
echo "1. Go to https://developer.apple.com/account"
echo "2. Click 'Membership details' (or find it in the URL after signing in)"
echo "3. Your Team ID is a 10-character alphanumeric code (e.g., ABCD1234EF)"
echo ""
read -p "Enter your Team ID: " TEAM_ID

if [ -z "$TEAM_ID" ] || [ ${#TEAM_ID} -ne 10 ]; then
    echo "❌ Invalid Team ID. It should be exactly 10 characters."
    exit 1
fi

echo "✅ Team ID: $TEAM_ID"
echo ""

# Step 2: Configure Appfile
echo "📝 Step 2: Configuring Fastlane..."

# Update Appfile with Team ID
cat > Appfile << EOF
# Appfile for Eidola

app_identifier("io.eidola.app")
team_id("$TEAM_ID")

# For App Store Connect (same as team_id for Individual accounts)
itc_team_id("$TEAM_ID")
EOF

echo "✅ Appfile updated"
echo ""

# Step 3: App Store Connect API Key
echo "🔑 Step 3: Setting up App Store Connect API Key..."
echo ""
echo "To create an API key:"
echo "1. Go to https://appstoreconnect.apple.com/access/integrations/api"
echo "2. Click '+' to create a new key"
echo "3. Name: 'Eidola Fastlane' (or any name)"
echo "4. Access: 'App Manager' role"
echo "5. Click 'Generate'"
echo "6. Download the .p8 file (you can only download it ONCE!)"
echo "7. Note the Key ID and Issuer ID shown on the page"
echo ""

read -p "Enter your API Key ID (e.g., ABC123DEF4): " KEY_ID
read -p "Enter your Issuer ID (UUID format): " ISSUER_ID
read -p "Enter the path to your downloaded .p8 file: " P8_PATH

if [ ! -f "$P8_PATH" ]; then
    echo "❌ File not found: $P8_PATH"
    exit 1
fi

# Copy the key to a secure location
mkdir -p ~/.appstoreconnect/private_keys
cp "$P8_PATH" ~/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8
chmod 600 ~/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8

# Create API key JSON for Fastlane
cat > api_key.json << EOF
{
  "key_id": "$KEY_ID",
  "issuer_id": "$ISSUER_ID",
  "key_filepath": "$HOME/.appstoreconnect/private_keys/AuthKey_${KEY_ID}.p8"
}
EOF

echo "✅ API key configured"
echo ""

# Step 4: Create/verify bundle ID in Apple Developer Portal
echo "🆔 Step 4: Bundle ID Registration..."
echo ""
echo "Make sure 'io.eidola.app' is registered in Apple Developer Portal:"
echo "1. Go to https://developer.apple.com/account/resources/identifiers/list"
echo "2. Click '+' if io.eidola.app isn't listed"
echo "3. Select 'App IDs' → 'App' → Continue"
echo "4. Description: 'Eidola'"
echo "5. Bundle ID: Explicit → 'io.eidola.app'"
echo "6. Enable capabilities: Push Notifications (if needed)"
echo ""
read -p "Press Enter when bundle ID is registered..."
echo ""

# Step 5: Create app in App Store Connect
echo "📱 Step 5: App Store Connect App..."
echo ""
echo "Make sure the app exists in App Store Connect:"
echo "1. Go to https://appstoreconnect.apple.com/apps"
echo "2. Click '+' → 'New App' if not created"
echo "3. Platform: iOS"
echo "4. Name: 'Eidola'"
echo "5. Primary Language: English (US)"
echo "6. Bundle ID: Select 'io.eidola.app'"
echo "7. SKU: 'io.eidola.app' (or any unique identifier)"
echo ""
read -p "Press Enter when app is created in App Store Connect..."
echo ""

# Step 6: Update Xcode project with Team ID
echo "🔧 Step 6: Updating Xcode project..."
cd ..

# Update the project with the correct team ID using sed
sed -i '' "s/DEVELOPMENT_TEAM = [A-Z0-9]*;/DEVELOPMENT_TEAM = $TEAM_ID;/g" App.xcodeproj/project.pbxproj

echo "✅ Xcode project updated with Team ID: $TEAM_ID"
echo ""

# Export environment variables
echo "📤 Step 7: Environment setup..."
echo ""
echo "Add these to your shell profile (~/.zshrc or ~/.bashrc):"
echo ""
echo "export TEAM_ID=\"$TEAM_ID\""
echo "export ASC_KEY_ID=\"$KEY_ID\""
echo "export ASC_ISSUER_ID=\"$ISSUER_ID\""
echo ""

# Create a local env file for reference
cat > ../.env.ios.local << EOF
# iOS Build Environment Variables
# Source this file before building: source .env.ios.local

export TEAM_ID="$TEAM_ID"
export ASC_KEY_ID="$KEY_ID"
export ASC_ISSUER_ID="$ISSUER_ID"
EOF

echo "✅ Environment file created: client/ios/.env.ios.local"
echo ""

echo "🎉 Setup Complete!"
echo "=================="
echo ""
echo "Next steps:"
echo "1. Open Xcode: open App.xcworkspace (or App.xcodeproj)"
echo "2. Go to Signing & Capabilities"
echo "3. Make sure your team ($TEAM_ID) is selected"
echo "4. Xcode should auto-create provisioning profiles"
echo ""
echo "Then run:"
echo "  cd fastlane"
echo "  fastlane beta"
echo ""
