# EAS Build Setup Guide

Your app is now configured for EAS Build! Follow these steps to create your development build.

## Step 1: Login to Expo

First, you need an Expo account. If you don't have one, you'll be prompted to create it.

```bash
eas login
```

Enter your Expo credentials or create a new account when prompted.

## Step 2: Create EAS Project

This links your local project to EAS Build servers:

```bash
eas build:configure
```

When prompted:
- Answer "Yes" to create an EAS project
- The command will update your `app.json` with a project ID

## Step 3: Build Development Client for iOS Simulator

This creates a custom app that includes all your native modules (MyScript, Skia, etc.):

```bash
eas build --profile development --platform ios
```

This will:
- Build your app on EAS servers (takes ~10-15 minutes)
- Include all native dependencies
- Create a simulator-compatible build
- Provide a download link when complete

## Step 4: Install the Development Build

Once the build completes, you'll get a download URL. Run:

```bash
# Download and extract the .tar.gz file
# Then install to simulator:
xcrun simctl install booted path/to/your-app.app
```

Or use the EAS CLI:

```bash
eas build:run -p ios
```

## Step 5: Start Metro Bundler

In your project directory:

```bash
npm start
```

## Step 6: Open the Development Client

Open the installed app on your simulator. It will connect to your Metro bundler automatically, just like Expo Go!

## Alternative: Build for Physical Device

If you want to install on your iPad:

```bash
# For internal distribution (Ad Hoc)
eas build --profile preview --platform ios
```

Then:
1. Download the IPA file from the provided link
2. Install using Apple Configurator or Xcode Devices window
3. Trust the developer certificate on your iPad (Settings > General > VPN & Device Management)

## Key Differences from Expo Go

✅ **Pros:**
- Includes ALL your custom native modules
- Hot reload works
- Can test on physical devices
- Works exactly like your production app

❌ **Cons:**
- Need to rebuild if you add new native dependencies
- Takes 10-15 minutes to build (not instant like Expo Go)

## Useful Commands

```bash
# Check build status
eas build:list

# View build logs
eas build:view

# Cancel a build
eas build:cancel

# Build for both iOS and Android
eas build --profile development --platform all
```

## Troubleshooting

### Build fails with "provisioning profile" error
- Use `eas build --profile development --platform ios` for simulator builds (no Apple Developer account needed)
- For physical device builds, you need an Apple Developer account

### App won't connect to Metro
- Make sure Metro is running (`npm start`)
- Shake device and select "Configure Bundler"
- Enter your computer's IP address

### Need to rebuild?
Only rebuild when:
- Adding new native modules
- Changing native configuration
- Updating iOS/Android build settings

JavaScript changes don't require rebuild - hot reload handles them!

## Next Steps

Once your development client is built and installed:
1. Make code changes
2. See them instantly with hot reload
3. No need to rebuild unless adding native modules

Your app now works like Expo Go but with all your custom native code!
