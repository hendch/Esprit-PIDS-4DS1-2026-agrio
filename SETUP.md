# AGRIO - Development Setup Guide (Current Structure)

This repo now has **two separate projects**:

- `frontend/` -> Expo React Native app (your disease detection feature is here)
- `backend/` -> FastAPI backend

Most setup problems happen when commands are run from the repo root instead of `frontend/`.

## Prerequisites

| Tool | Recommended | Check |
|---|---|---|
| Node.js | 20+ (24 also works) | `node -v` |
| npm | 10+ | `npm -v` |
| Git | 2.30+ | `git --version` |
| Git LFS | latest | `git lfs version` |
| Java JDK | 17 | `java -version` |
| Android Studio | latest | open Android Studio |

> Use **JDK 17** for Android builds.

## Android SDK Requirements (Frontend)

Install with Android Studio SDK Manager:

- Android SDK Platform (latest stable)
- Android SDK Platform-Tools
- Android SDK Build-Tools
- Android Emulator
- NDK (Side by side) 26.x
- CMake 3.22.1

## 1) Clone + LFS

```bash
git lfs install
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio
git lfs pull
```

Model file should exist here:

```bash
frontend/assets/model/efficientnet_plantvillage.tflite
```

## 2) Frontend Setup (IMPORTANT)

Run all Expo commands from `frontend/`:

```bash
cd frontend
npm install
```

If PowerShell blocks `npm` script execution, use:

```bash
npm.cmd install
```

### Start Metro

```bash
npx expo start
```

### Run Android

```bash
npx expo prebuild --platform android
npx expo run:android
```

If SDK is not found, create `frontend/android/local.properties`:

```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

## 3) Backend Setup (Optional for mobile UI work)

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate
pip install -e ".[dev]"
uvicorn app.main:app --reload
```

## Disease Detection Paths (New Structure)

- `frontend/src/features/diseaseDetection/DiseaseDetectionScreen.tsx`
- `frontend/src/features/diseaseDetection/diseaseDetectionService.ts`
- `frontend/src/features/diseaseDetection/diseaseAdviceData.ts`
- `frontend/src/core/language/languageStore.ts`
- `frontend/src/core/language/useLanguage.ts`
- `frontend/metro.config.js` (must include `.tflite` in `assetExts`)

## Troubleshooting

### Invalid character TS errors in language files
If you see many `TS1127: Invalid character` errors, text files were corrupted (null-byte content). Replace with clean UTF-8 text files.

### Metro cannot resolve `.tflite`
Confirm `frontend/metro.config.js` exists and pushes `"tflite"` into `config.resolver.assetExts`.

### NDK/CMake native build errors
Install NDK + CMake from Android Studio, then clean and rebuild:

```bash
cd frontend/android
./gradlew clean
cd ..
npx expo run:android
```

### Windows `Filename longer than 260 characters` or `std::format` C++ errors
If Android build fails in `safe-area-context` codegen or `expo-modules-core` with `x86_64` on Windows:

1. Keep New Architecture disabled:
   - `frontend/app.json` -> `"newArchEnabled": false`
   - `frontend/android/gradle.properties` -> `newArchEnabled=false`
2. Clean old native caches:
```bash
cd frontend/android
./gradlew clean
cd ..
npx expo run:android
```

### "Cannot find module 'buffer'" or `jpeg-js`

```bash
cd frontend
# Windows PowerShell:
Remove-Item -LiteralPath node_modules -Recurse -Force
# macOS/Linux:
# rm -rf node_modules
npm install
```

## Quick Start

```bash
git lfs install
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio/frontend
npm install
npx expo prebuild --platform android
npx expo run:android
```
