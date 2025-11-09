# Deployment Guide

Build configuration, release procedures, and deployment workflows for iOS App Store distribution.

---

## Table of Contents

1. [Pre-Deployment Checklist](#pre-deployment-checklist)
2. [iOS Build Process](#ios-build-process)
3. [Build Automation Script](#build-automation-script)
4. [Environment Management](#environment-management)
5. [Code Signing & Provisioning](#code-signing--provisioning)
6. [App Store Submission](#app-store-submission)
7. [Version Management](#version-management)
8. [Rollback Procedures](#rollback-procedures)
9. [Monitoring & Post-Deployment](#monitoring--post-deployment)
10. [Android Deployment (Future)](#android-deployment-future)

---

## Pre-Deployment Checklist

### Code Quality

- [ ] All tests passing (`npm test` - 139 tests)
- [ ] No TypeScript errors (`npm run typecheck`)
- [ ] Code linted (`npm run lint`)
- [ ] Code formatted (`npm run format`)

### Configuration

- [ ] Environment variables configured for production
- [ ] API keys valid and within rate limits:
  - [ ] MyScript Cloud API (handwriting recognition)
  - [ ] UpStudy API (math validation)
  - [ ] CameraMath API (hints - optional)
  - [ ] Supabase (cloud sync - optional)
- [ ] Sentry DSN configured for production error tracking
- [ ] Version number updated in `package.json` and `ios/handwritingMathApp/Info.plist`
- [ ] Build number incremented in Xcode project

### Documentation

- [ ] CHANGELOG.md updated with release notes
- [ ] README.md reflects current features
- [ ] API documentation up-to-date

### Testing

- [ ] Tested on target devices:
  - [ ] iPad 9th gen (minimum supported device)
  - [ ] iPad Pro 11" (recommended device)
- [ ] Tested all orientations (portrait, landscape)
- [ ] Tested with Apple Pencil and touch input
- [ ] Performance verified (60+ FPS canvas, <2s validation)
- [ ] Offline functionality tested (MMKV persistence)

---

## iOS Build Process

### Manual Build (Xcode)

#### Step 1: Open Xcode Workspace

```bash
cd ios
open handwritingMathApp.xcworkspace
```

**Note:** Always use `.xcworkspace`, not `.xcodeproj` (CocoaPods requirement)

---

#### Step 2: Select Scheme and Destination

- **Scheme:** handwritingMathApp
- **Destination:** Any iOS Device (arm64)

---

#### Step 3: Clean Build Folder

```
Product > Clean Build Folder (Cmd+Shift+K)
```

**Or manually:**
```bash
xcodebuild clean
rm -rf ~/Library/Developer/Xcode/DerivedData
```

---

#### Step 4: Archive for Release

```
Product > Archive (Cmd+B to build first)
```

**Wait for build to complete (2-5 minutes)**

**Manual command:**
```bash
xcodebuild archive \
  -workspace handwritingMathApp.xcworkspace \
  -scheme handwritingMathApp \
  -configuration Release \
  -archivePath ./build/handwritingMathApp.xcarchive \
  -allowProvisioningUpdates \
  CODE_SIGN_STYLE=Automatic
```

---

#### Step 5: Export IPA

1. Xcode Organizer opens automatically after archive
2. Select archive → **Distribute App**
3. Choose distribution method:
   - **App Store Connect** (for TestFlight/App Store)
   - **Ad Hoc** (for internal testing)
   - **Development** (for local testing)
4. Select provisioning profile (automatic or manual)
5. Review and **Export**

**Manual command:**
```bash
xcodebuild -exportArchive \
  -archivePath ./build/handwritingMathApp.xcarchive \
  -exportPath ./build \
  -exportOptionsPlist ExportOptions.plist \
  -allowProvisioningUpdates
```

---

### Using Fastlane (Recommended for Automation)

#### Install Fastlane

```bash
sudo gem install fastlane
```

---

#### Initialize Fastlane (First Time)

```bash
cd ios
fastlane init
```

**Select option:** "Manual setup"

---

#### Configure Fastfile

Create `ios/fastlane/Fastfile`:

```ruby
default_platform(:ios)

platform :ios do
  desc "Build and upload to TestFlight"
  lane :beta do
    # Increment build number
    increment_build_number(xcodeproj: "handwritingMathApp.xcodeproj")

    # Build app
    build_app(
      workspace: "handwritingMathApp.xcworkspace",
      scheme: "handwritingMathApp",
      export_method: "app-store",
      configuration: "Release"
    )

    # Upload to TestFlight
    upload_to_testflight(
      skip_waiting_for_build_processing: true
    )
  end

  desc "Build for App Store release"
  lane :release do
    # Increment version
    increment_version_number(xcodeproj: "handwritingMathApp.xcodeproj")

    # Build app
    build_app(
      workspace: "handwritingMathApp.xcworkspace",
      scheme: "handwritingMathApp",
      export_method: "app-store",
      configuration: "Release"
    )

    # Upload to App Store
    upload_to_app_store(
      submit_for_review: false,
      automatic_release: false
    )
  end
end
```

---

#### Run Fastlane

```bash
# Upload to TestFlight
cd ios
fastlane beta

# Build for App Store release
fastlane release
```

---

## Build Automation Script

### Using `scripts/build-ios.sh`

The project includes an automated build script: `scripts/build-ios.sh`

**Usage:**
```bash
# From project root
./scripts/build-ios.sh
```

**Or via npm:**
```bash
npm run build:ios
```

---

### What the Script Does

1. ✅ Checks prerequisites (Xcode, CocoaPods)
2. 🧹 Cleans previous builds
3. 📦 Installs CocoaPods dependencies
4. 📦 Archives app for release
5. 📤 Exports IPA
6. 🚀 Optionally uploads to TestFlight (via Fastlane)

---

### Script Configuration

**Edit `scripts/build-ios.sh` if needed:**

```bash
# App name (must match Xcode project)
APP_NAME="handwritingMathApp"

# Build configuration
CONFIGURATION="Release"

# Export options (for App Store, Ad Hoc, etc.)
EXPORT_OPTIONS="./ios/ExportOptions.plist"
```

---

### ExportOptions.plist

Create `ios/ExportOptions.plist` for automated export:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>method</key>
    <string>app-store</string> <!-- or "ad-hoc", "enterprise", "development" -->
    <key>teamID</key>
    <string>YOUR_TEAM_ID</string> <!-- Replace with your Apple Team ID -->
    <key>uploadSymbols</key>
    <true/>
    <key>compileBitcode</key>
    <false/>
    <key>signingStyle</key>
    <string>automatic</string>
</dict>
</plist>
```

**Find your Team ID:**
- Xcode → Preferences → Accounts → Select your Apple ID → View Details
- Or: App Store Connect → Membership → Team ID

---

## Environment Management

### Development vs Production

**Development (.env):**
```bash
APP_ENV=development
SENTRY_ENVIRONMENT=development
ENABLE_FLIPPER=true  # Optional debugging
```

**Production (.env.production):**
```bash
APP_ENV=production
SENTRY_ENVIRONMENT=production
ENABLE_FLIPPER=false
```

---

### Loading Production Environment

**Option 1: Manual swap**
```bash
# Before building for release
cp .env.production .env
./scripts/build-ios.sh
```

**Option 2: Build-time environment selection**

Update `babel.config.js`:

```javascript
module.exports = {
  presets: ['module:@react-native/babel-preset'],
  plugins: [
    [
      'module:react-native-dotenv',
      {
        moduleName: '@env',
        path: process.env.APP_ENV === 'production' ? '.env.production' : '.env',
      },
    ],
    'react-native-reanimated/plugin',
  ],
};
```

**Build command:**
```bash
APP_ENV=production ./scripts/build-ios.sh
```

---

### Handling API Keys Securely

**Best Practices:**

1. ✅ **Never commit** `.env` files (already in `.gitignore`)
2. ✅ **Use separate keys** for development and production
3. ✅ **Store production keys** in secure vault (1Password, Bitwarden)
4. ✅ **Rotate keys** periodically (every 6-12 months)
5. ✅ **Monitor API usage** to detect key leaks

**For CI/CD:**
- Use GitHub Secrets or environment variables
- Inject keys at build time (not hardcoded)

---

## Code Signing & Provisioning

### Apple Developer Account Requirements

**Account Type:** Individual or Organization

**Costs:**
- **Individual:** $99/year
- **Organization:** $99/year (with D-U-N-S Number)

**Setup:**
1. Register at [developer.apple.com](https://developer.apple.com)
2. Enroll in Apple Developer Program
3. Create App ID
4. Configure signing in Xcode

---

### Certificates

**Development Certificate:**
- Used for testing on physical devices
- Valid for 1 year
- Can have multiple per team

**Distribution Certificate:**
- Used for App Store submission
- Valid for 1 year
- Limited to 3 per team

**Create/Manage Certificates:**
1. Xcode → Preferences → Accounts → Manage Certificates
2. Or: [developer.apple.com/certificates](https://developer.apple.com/certificates)

---

### Provisioning Profiles

**Development Profile:**
- Links device UDIDs to development certificate
- Used for testing on registered devices

**App Store Profile:**
- Links app to distribution certificate
- Used for App Store submission

**Automatic Provisioning (Recommended):**
1. Open Xcode project
2. Select target → Signing & Capabilities
3. Enable "Automatically manage signing"
4. Select team
5. Xcode generates profiles automatically

**Manual Provisioning:**
1. Create App ID at [developer.apple.com/identifiers](https://developer.apple.com/identifiers)
2. Create provisioning profile at [developer.apple.com/profiles](https://developer.apple.com/profiles)
3. Download and double-click to install
4. Select in Xcode Signing settings

---

### App ID and Bundle Identifier

**Bundle Identifier Format:**
```
com.yourcompany.handwritingmathapp
```

**Configure in Xcode:**
1. Select project in navigator
2. Select target "handwritingMathApp"
3. General tab → Identity → Bundle Identifier

**Capabilities:**
- ✅ None required for MVP
- 🔜 Future: Push Notifications, In-App Purchase (post-MVP)

---

## App Store Submission

### App Store Connect Setup

1. **Create App Record**
   - Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
   - My Apps → + → New App
   - Platform: iOS
   - Name: "Handwriting Math App" (or your chosen name)
   - Primary Language: English
   - Bundle ID: Select from dropdown
   - SKU: Unique identifier (e.g., `handwriting-math-001`)

2. **App Information**
   - Subtitle (optional): Short description (30 chars)
   - Privacy Policy URL: Required (host on website or GitHub Pages)
   - Category: Education
   - Age Rating: 4+ (no objectionable content)

---

### App Metadata

**Name:** Handwriting Math App (or your chosen name)

**Subtitle (30 chars):** "Learn math through handwriting"

**Description (4000 chars max):**
```
Solve math problems with your Apple Pencil or finger! Handwriting Math App helps students learn algebra through interactive handwriting recognition and step-by-step validation.

Features:
• Natural handwriting input with Apple Pencil support
• Real-time math recognition and validation
• Progressive hints that guide without giving away answers
• Track your progress and review past solutions
• Offline support with cloud sync

Perfect for students learning linear equations and algebra. Practice problems range from simple one-step equations to complex multi-step problems.

No subscription required - download and start learning today!
```

**Keywords (100 chars):**
```
math, algebra, handwriting, education, Apple Pencil, equations, learning, homework, tutor
```

---

### Screenshots and App Preview

**Required Sizes (iPad):**
- 12.9" iPad Pro (3rd gen): 2048 x 2732 px
- 12.9" iPad Pro (2nd gen): 2048 x 2732 px

**Screenshots to Include:**
1. Home screen with problem selection
2. Canvas with handwriting input
3. Validation feedback (correct answer)
4. Hint system in action
5. Progress tracking screen

**App Preview Video (Optional, Recommended):**
- 15-30 seconds
- Shows complete workflow: select problem → draw → validate → hint
- Highlight Apple Pencil usage

**Tools:**
- iOS Simulator (Cmd+S to take screenshot)
- QuickTime Player for screen recording
- Sketch/Figma for creating marketing screenshots

---

### Privacy Policy

**Required Information:**
- What data is collected (user progress, problem attempts)
- How data is used (app functionality, error tracking)
- Third-party services (MyScript, UpStudy, Sentry, Supabase)
- Data retention policy
- User rights (data export, deletion)

**Hosting Options:**
- GitHub Pages (free)
- Company website
- Privacy policy generators (e.g., [privacypolicies.com](https://www.privacypolicies.com))

**Example Privacy Policy Structure:**
```markdown
# Privacy Policy for Handwriting Math App

## Data Collection
We collect the following data to provide app functionality:
- Problem attempts and solution steps (stored locally)
- Handwriting recognition requests (sent to MyScript API)
- Math validation requests (sent to UpStudy API)

## Data Usage
Your data is used solely to:
- Provide math problem validation
- Track your learning progress
- Improve app performance and error handling

## Third-Party Services
- MyScript Cloud API (handwriting recognition)
- UpStudy API (math validation)
- Sentry (error tracking)
- Supabase (optional cloud sync)

## Data Retention
- Local data persists until you delete the app
- Cloud sync data is retained for your account lifetime
- You can export or delete your data anytime in Settings

## Contact
For privacy inquiries: privacy@yourcompany.com
```

---

### TestFlight Beta Testing (Recommended Before Production)

**Why TestFlight?**
- Test with real users before public launch
- Gather feedback and crash reports
- Iterate on UX without affecting App Store reviews

**Setup:**
1. Upload build to App Store Connect (via Xcode or Fastlane)
2. App Store Connect → TestFlight tab
3. Add internal testers (team members, up to 100)
4. Add external testers (beta users, up to 10,000)
5. Submit for Beta App Review (required for external testers)

**External Beta Testing Requires:**
- Export compliance information (encryption declaration)
- What to Test notes (guide for testers)
- Beta App Review approval (~24 hours)

**Distribution:**
- Testers install TestFlight app from App Store
- Invite via email
- Testers download your app via TestFlight

---

### App Store Review Process

**Submission Checklist:**
- [ ] Build uploaded to App Store Connect
- [ ] App metadata complete (name, description, keywords)
- [ ] Screenshots uploaded (all required sizes)
- [ ] Privacy policy URL provided
- [ ] Age rating set
- [ ] Pricing and availability configured
- [ ] Export compliance answered (does app use encryption?)

**Review Guidelines to Note:**
- No crashes or bugs (use TestFlight to catch issues)
- App functions as described
- Privacy policy matches data collection
- No placeholder content or "Lorem ipsum"
- App is complete and production-ready

**Typical Review Timeline:**
- Submission → In Review: 1-3 days
- In Review → Approved/Rejected: 24-48 hours
- Total: 2-5 days average

**If Rejected:**
- Read rejection reason carefully
- Fix issues
- Respond to reviewer or submit new build
- Average resolution time: 1-2 business days

---

## Version Management

### Semantic Versioning

**Format:** MAJOR.MINOR.PATCH

```
1.0.0 - Initial release
1.0.1 - Bug fix (patch)
1.1.0 - New feature (minor)
2.0.0 - Breaking change (major)
```

**Examples:**
- `1.0.0` - MVP release (current target)
- `1.0.1` - Fix validation API bug
- `1.1.0` - Add voice hints feature
- `1.2.0` - Add assessment mode
- `2.0.0` - Redesign canvas engine (breaking change)

---

### Updating Version Numbers

#### 1. Update package.json

```json
{
  "version": "1.0.1"
}
```

#### 2. Update iOS Project

**Option A: Xcode**
1. Select project in navigator
2. Select target → General
3. Update **Version** (e.g., `1.0.1`)
4. Increment **Build** (e.g., `2`)

**Option B: Manual (Info.plist)**
```xml
<key>CFBundleShortVersionString</key>
<string>1.0.1</string>
<key>CFBundleVersion</key>
<string>2</string>
```

**Option C: Fastlane**
```bash
fastlane run increment_version_number version_number:1.0.1
fastlane run increment_build_number
```

---

### Build Number Incrementation

**Rules:**
- Increment for **every** TestFlight upload
- Must be unique per version
- Can reset to 1 when version number changes

**Example:**
```
Version 1.0.0, Build 1  (initial upload)
Version 1.0.0, Build 2  (bug fix, same version)
Version 1.0.1, Build 1  (new version, reset build)
```

---

### Git Tagging Releases

```bash
# Create tag
git tag -a v1.0.0 -m "Release version 1.0.0"

# Push tag
git push origin v1.0.0

# List tags
git tag -l
```

**Tag Format:** `v{MAJOR}.{MINOR}.{PATCH}`

**GitHub Releases:**
1. Go to repository → Releases → New Release
2. Select tag `v1.0.0`
3. Release title: "Version 1.0.0 - Initial MVP Release"
4. Add release notes from CHANGELOG.md
5. Attach IPA (optional, for archives)

---

## Rollback Procedures

### TestFlight Phased Rollout

**Strategy:**
- Start with 10% of users
- Monitor for crashes and issues
- Increase to 25% → 50% → 100% over 1-2 weeks

**How:**
1. App Store Connect → App → Version
2. Phased Release → Turn On
3. Select rollout speed (7-day or custom)

**Pause Rollout:**
- App Store Connect → Version → Pause Phased Release
- Investigate issues
- Resume or cancel

---

### Reverting to Previous Build

**If Critical Bug Found:**

1. **TestFlight:** Remove current build from testing
2. **App Store:**
   - Cannot revert live version
   - Options:
     - a) Hotfix: Build and submit patch immediately
     - b) Remove from sale (drastic, temporary only)

**Hotfix Workflow:**
```bash
# Create hotfix branch
git checkout -b hotfix/1.0.1 v1.0.0

# Fix bug
# ... make changes ...

# Commit fix
git commit -m "fix: critical validation bug"

# Increment version
# Update package.json: 1.0.0 → 1.0.1

# Build and submit
./scripts/build-ios.sh

# Upload to App Store Connect
# Submit for expedited review (include reason)
```

**Expedited Review:**
- Request in App Store Connect
- Explain urgency (e.g., "Critical bug prevents app functionality")
- Approval typically within 24 hours

---

### Handling Critical Production Bugs

**Severity Levels:**

**P0 - Critical (App Crash):**
- Hotfix immediately
- Request expedited review
- Notify users via social media/website

**P1 - High (Feature Broken):**
- Hotfix within 24 hours
- Standard review process

**P2 - Medium (UI Bug):**
- Include in next planned release

**P3 - Low (Minor Issue):**
- Backlog for future release

---

## Monitoring & Post-Deployment

### Sentry Error Tracking

**Setup:**
```bash
# .env.production
SENTRY_DSN=https://your-dsn@sentry.io/project-id
SENTRY_ENVIRONMENT=production
```

**Dashboard Monitoring:**
- [sentry.io](https://sentry.io) → Projects → Handwriting Math App
- Check for crash reports, errors, performance issues
- Set up alerts for high error rates

**Key Metrics:**
- Crash-free sessions (target: >99%)
- Errors per session (target: <0.1)
- Performance: API call durations, canvas frame rates

---

### API Usage Monitoring

**MyScript Cloud API:**
- Dashboard: [developer.myscript.com/dashboard](https://developer.myscript.com/dashboard)
- Monitor: API calls, rate limits, quota usage

**UpStudy API:**
- Monitor: Request count, response times, error rates
- Set alerts for rate limit warnings

**CameraMath API:**
- Monitor: Hint request frequency, quota

**Supabase:**
- Dashboard: [app.supabase.com](https://app.supabase.com)
- Monitor: Database usage, API calls, bandwidth

---

### App Store Analytics

**App Store Connect → Analytics:**
- **Impressions:** How many users saw your app
- **Product Page Views:** How many visited app page
- **Downloads:** Total installs
- **Updates:** Users upgrading to new version
- **Retention:** Day 1, Day 7, Day 30 retention rates

**Key Metrics to Track:**
- Downloads per day
- Conversion rate (page views → downloads)
- Retention rate (target: >40% Day 1, >20% Day 7)
- Crash rate (target: <0.5%)

---

### App Store Reviews and Ratings

**Monitoring:**
- App Store Connect → App → Ratings and Reviews
- Respond to reviews (especially negative ones)

**Encouraging Reviews:**
- Prompt users after successful problem completion
- Use `SKStoreReviewController` (iOS native)
- Don't spam (iOS limits prompts to 3 per year per user)

**Responding to Reviews:**
- Thank positive reviews
- Address concerns in negative reviews
- Explain fixes for reported bugs

---

## Android Deployment (Future)

**Status:** Descoped for MVP, placeholder for future work.

### Google Play Console Setup

1. Create developer account ($25 one-time fee)
2. Create app listing
3. Upload APK or AAB (Android App Bundle)
4. Set up metadata, screenshots, pricing

### Build Android Release

```bash
# Generate release AAB
cd android
./gradlew bundleRelease

# Output: android/app/build/outputs/bundle/release/app-release.aab
```

### Code Signing

**Create keystore:**
```bash
keytool -genkeypair -v -keystore my-release-key.keystore -alias my-key-alias -keyalg RSA -keysize 2048 -validity 10000
```

**Configure gradle:**
```gradle
// android/app/build.gradle
android {
  signingConfigs {
    release {
      storeFile file('my-release-key.keystore')
      storePassword 'your-password'
      keyAlias 'my-key-alias'
      keyPassword 'your-password'
    }
  }
}
```

### ProGuard/R8 Configuration

**For app size reduction and code obfuscation:**
```
# android/app/proguard-rules.pro
-keep class com.facebook.react.** { *; }
-keep class com.swmansion.** { *; }
-dontwarn com.facebook.react.**
```

---

## Related Documentation

- [SETUP.md](SETUP.md) - Development environment setup
- [TESTING.md](TESTING.md) - Test strategy and execution
- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [CONTRIBUTING.md](../CONTRIBUTING.md) - Development workflow

---

## Quick Reference

### Build Commands

```bash
# Test before deployment
npm test

# Build iOS release
./scripts/build-ios.sh

# Or with Fastlane
cd ios && fastlane beta

# Build for App Store
cd ios && fastlane release
```

### Version Update Workflow

```bash
# 1. Update version in package.json
npm version patch  # 1.0.0 → 1.0.1

# 2. Update iOS version (Xcode or fastlane)
fastlane run increment_version_number version_number:1.0.1

# 3. Update CHANGELOG.md

# 4. Commit changes
git commit -am "chore: bump version to 1.0.1"

# 5. Tag release
git tag -a v1.0.1 -m "Release 1.0.1"
git push origin v1.0.1

# 6. Build and deploy
./scripts/build-ios.sh
```

---

**Last Updated:** PR11 (November 2024)
