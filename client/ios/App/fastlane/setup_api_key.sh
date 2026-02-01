#!/bin/bash
# App Store Connect API Key Setup for Eidola
# This enables fully CLI-based TestFlight uploads (no Xcode sign-in needed)

set -e

echo "🔑 App Store Connect API Key Setup"
echo "===================================="
echo ""
echo "Get your API key from:"
echo "https://appstoreconnect.apple.com/access/integrations/api"
echo ""
echo "1. Click '+' to create new key"
echo "2. Name: 'Eidola Fastlane'"
echo "3. Access: 'App Manager'"
echo "4. Download the .p8 file"
echo ""

read -p "Enter Key ID (e.g., ABC123DEFG): " KEY_ID
read -p "Enter Issuer ID (UUID from the page): " ISSUER_ID
read -p "Path to downloaded .p8 file: " P8_PATH

if [ ! -f "$P8_PATH" ]; then
    echo "❌ File not found: $P8_PATH"
    exit 1
fi

# Copy the key
cp "$P8_PATH" "./AuthKey_${KEY_ID}.p8"

# Create the JSON config
cat > api_key.json << EOF
{
  "key_id": "${KEY_ID}",
  "issuer_id": "${ISSUER_ID}",
  "key_filepath": "./AuthKey_${KEY_ID}.p8"
}
EOF

# Update Fastfile to use API key
cat > Fastfile << 'FASTFILE'
default_platform(:ios)

platform :ios do
  before_all do
    app_store_connect_api_key(
      key_id: ENV["ASC_KEY_ID"] || JSON.parse(File.read("api_key.json"))["key_id"],
      issuer_id: ENV["ASC_ISSUER_ID"] || JSON.parse(File.read("api_key.json"))["issuer_id"],
      key_filepath: ENV["ASC_KEY_PATH"] || JSON.parse(File.read("api_key.json"))["key_filepath"]
    )
  end

  desc "Push a new beta build to TestFlight"
  lane :beta do
    # Sync certificates and profiles
    match(type: "appstore", readonly: is_ci)
    
    # Build
    build_app(
      scheme: "App",
      workspace: "App.xcworkspace",
      export_method: "app-store"
    )
    
    # Upload
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end
  
  desc "Just build (no upload)"
  lane :build do
    match(type: "appstore", readonly: true)
    build_app(
      scheme: "App", 
      workspace: "App.xcworkspace",
      export_method: "app-store"
    )
  end
end
FASTFILE

echo ""
echo "✅ API key configured!"
echo ""
echo "Add .p8 and api_key.json to .gitignore (secrets):"
echo "  echo 'AuthKey_*.p8' >> .gitignore"
echo "  echo 'api_key.json' >> .gitignore"
echo ""
echo "Now run: fastlane beta"
