# AGRIO - Development Setup Guide

## Prerequisites

Before you start, make sure you have these installed:

| Tool | Tested Version | How to check | Install from |
|------|---------------|-------------|-------------|
| Node.js | v24.14.0 | `node -v` | https://nodejs.org (LTS or Current) |
| npm | 11.9.0 | `npm -v` | Comes with Node.js |
| Git | 2.30+ | `git --version` | https://git-scm.com |
| Git LFS | any | `git lfs version` | https://git-lfs.com |
| Java JDK | **17** (Temurin) | `java -version` | https://adoptium.net |
| Android Studio | latest | Open it | https://developer.android.com/studio |

> **Important**: JDK must be version **17**. JDK 21 may cause Gradle issues.

## Android SDK Setup (Required for Android builds)

1. Install **Android Studio**
2. Open Android Studio > **Settings** > **SDK Manager**
3. Under **SDK Platforms** tab, install:
   - **Android 15.0 (API 36)** — or latest available
4. Under **SDK Tools** tab, check these are installed:
   - Android SDK Build-Tools **36.0.0**
   - Android SDK Platform-Tools
   - Android Emulator
   - **NDK (Side by side)** — install version **26.1.10909125** (required by react-native-fast-tflite)
   - **CMake 3.22.1** (required by react-native-fast-tflite)
5. Note your SDK path (shown at top of SDK Manager):
   - **Windows**: `C:\Users\<YOU>\AppData\Local\Android\Sdk`
   - **macOS**: `~/Library/Android/sdk`
   - **Linux**: `~/Android/Sdk`

## Step-by-Step Setup

### 1. Install Git LFS (one-time)

```bash
git lfs install
```

### 2. Clone the repository

```bash
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio
```

Git LFS will automatically download the TFLite model file (~30MB) during clone.

Verify the model downloaded correctly:
```bash
# Should show ~30MB, NOT a small text pointer file
ls -lh assets/model/efficientnet_plantvillage.tflite
```

If it shows a tiny file (< 1KB), run:
```bash
git lfs pull
```

### 3. Install dependencies

```bash
npm install
```

### 4. Generate the native Android project

```bash
npx expo prebuild --platform android
```

This generates the `android/` folder with all native code. It will automatically create `android/local.properties` pointing to your SDK.

> **If it doesn't find your SDK**, create `android/local.properties` manually:
> ```properties
> sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
> ```
> Replace `YOUR_USERNAME` with your actual Windows username.

### 5. Run on Android

**Option A - Physical device (recommended):**
1. Enable **Developer Options** on your phone (tap "Build Number" 7 times in Settings > About Phone)
2. Enable **USB Debugging** in Developer Options
3. Connect phone via USB cable
4. Run:
```bash
npx expo run:android
```

**Option B - Emulator (tested config):**
1. Open Android Studio > **Device Manager** > Create Virtual Device
2. Pick **Pixel 7**
3. Select system image: **Tiramisu (API 33)** — x86_64 (download it if not available)
4. Finish setup, then start the emulator
5. Run:
```bash
npx expo run:android
```

> **Note**: The first build takes 5-10 minutes as it compiles native modules (TFLite C++ code). Subsequent builds are much faster.

### 6. Run on iOS (macOS only)

```bash
npx expo prebuild --platform ios
npx expo run:ios
```

## Environment Variables

No `.env` file is needed. The app runs fully on-device with no external API keys.

## Key Dependencies

| Package | Why it's needed |
|---------|----------------|
| `react-native-fast-tflite` | Runs the TFLite ML model on-device (needs NDK + CMake) |
| `expo-image-manipulator` | Resizes captured photos to 260x260 before feeding to model |
| `expo-image-picker` | Lets user pick photos from gallery |
| `expo-camera` | Camera access for capturing leaf photos |
| `jpeg-js` | Decodes JPEG images to raw pixel data for model input |
| `buffer` | Node.js Buffer polyfill needed by jpeg-js in React Native |
| `zustand` | Lightweight state management (theme, language, user store) |

## Project Structure (Disease Detection Feature)

```
assets/
  model/
    efficientnet_plantvillage.tflite   # ML model (~30MB, tracked via Git LFS)
  class_names.json                     # 31 disease class names

src/features/diseaseDetection/
  DiseaseDetectionScreen.tsx           # UI - camera, gallery, results, advice
  diseaseDetectionService.ts           # ML inference pipeline
  diseaseAdviceData.ts                 # Disease names + advice in EN/AR

src/core/language/
  languageStore.ts                     # Zustand store for EN/AR toggle
  useLanguage.ts                       # Hook for language state

metro.config.js                        # Adds .tflite to Metro asset extensions
```

## Troubleshooting

### "SDK location not found"
Create `android/local.properties` with your SDK path (see Step 4).

### Build fails with NDK/CMake errors
`react-native-fast-tflite` compiles C++ code and needs NDK + CMake.
1. Open Android Studio > Settings > SDK Manager > SDK Tools
2. Check **NDK (Side by side)** is installed (version 26.x)
3. Check **CMake** is installed (version 3.22.1)
4. Clean and rebuild:
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

### Model file is 0 bytes or shows text content
Git LFS wasn't set up before cloning. Fix:
```bash
git lfs install
git lfs pull
```

### Metro bundler can't resolve .tflite files
Make sure `metro.config.js` exists in the project root (it's committed in the repo).

### "Cannot find module 'buffer'" or "jpeg-js" errors
```bash
rm -rf node_modules
npm install
```

### Build fails on first try after prebuild
Try cleaning:
```bash
cd android && ./gradlew clean && cd ..
npx expo run:android
```

### Gradle version mismatch
The project uses Gradle 8.14.3. If you see version errors:
```bash
rm -rf android
npx expo prebuild --platform android --clean
```

### First build is very slow
Normal. Native modules (TFLite C++ code) compile from source. Takes 5-10 min on first build, then Gradle caches it.

## Quick Reference (TL;DR)

```bash
git lfs install
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio
npm install
npx expo prebuild --platform android
npx expo run:android
```
