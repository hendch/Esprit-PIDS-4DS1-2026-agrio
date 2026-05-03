# AGRIO - Development Setup Guide

This repo has **two separate projects**:

- `frontend/` -> Expo React Native app (disease detection, irrigation UI, dashboard, auth)
- `backend/` -> FastAPI backend (auth, irrigation AI agent, MQTT IoT gateway, PostgreSQL)

Most setup problems happen when commands are run from the repo root instead of the correct subfolder.

## Prerequisites

| Tool | Recommended | Check |
|---|---|---|
| Node.js | 20+ (24 also works) | `node -v` |
| npm | 10+ | `npm -v` |
| Python | 3.11+ | `python --version` |
| Docker Desktop | latest | `docker --version` |
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

---

## 1) Clone + LFS

```bash
git lfs install
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio
git lfs pull
```

The disease detection model file should exist here:

```
frontend/assets/model/efficientnet_plantvillage.tflite
```

---

## 2) Backend Setup

### 2.1) Start PostgreSQL with Docker

```bash
cd backend
docker compose up -d
```

This starts a Postgres container (`postgres:15`) on port `5432` with user `postgres`, password `postgres`, database `agrio`.

> If you previously ran compose with different `POSTGRES_*` values, do a one-time reset:
> ```bash
> docker compose down -v
> docker compose up -d
> ```

### 2.2) Create your env file

```bash
cd backend
cp .env.example backend.env
```

Edit `backend.env` and fill in:

| Variable | Required | Notes |
|---|---|---|
| `AGRIO_DATABASE_URL` | Yes | Already set correctly in the template |
| `AGRIO_JWT_SECRET` | Yes | Set to any non-empty string (e.g. `mysecret123`). Do NOT leave empty |
| `AGRIO_GROQ_API_KEY` | Yes | Get a free key from [console.groq.com](https://console.groq.com). Needed for the irrigation AI agent |
| `AGRIO_DEBUG` | No | `true` for dev |
| `AGRIO_CORS_ORIGINS` | No | Uncomment if testing from web browser |
| `AGRIO_MQTT_*` | No | Defaults work with the Wokwi ESP32 simulator |

> **IMPORTANT:** Never commit `backend.env`. Only `backend/.env.example` is shared.

### 2.3) Install Python dependencies and run

```bash
cd backend
python -m venv .venv

# Windows:
.venv\Scripts\activate
# macOS/Linux:
# source .venv/bin/activate

pip install -e ".[dev]"
pip install psycopg2-binary lxml
python -c "import asyncio; from app.persistence.db import init_models; asyncio.run(init_models())"
alembic stamp head
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Interactive docs at `http://localhost:8000/docs`.

> **Heads up:** the price-prediction modules pull in heavy ML deps (`prophet`, `lightgbm`, `statsmodels`, `scikit-learn`, `pyarrow`). Expect a multi-minute install on first run.

> **Schema setup is non-standard.** This branch creates tables via `Base.metadata.create_all()` (called by `init_models()`), NOT via Alembic migrations. Alembic migrations are only ALTER deltas — they assume the tables already exist. Running `alembic upgrade head` on an empty DB fails with `relation "market_forecasts" does not exist`. The correct sequence on a fresh DB is:
> 1. `init_models()` to create every table from the SQLAlchemy models
> 2. `alembic stamp head` to mark all migrations as already applied (the columns they would add are already in the models)
>
> After this, future `alembic upgrade head` calls work normally for new migrations added on top.

> **`psycopg2-binary` and `lxml` are not in pyproject.toml** but both are needed: `psycopg2-binary` for the sync seed scripts, `lxml` for two `.xls` market-price files (`bovins_suivis`, `vaches_gestantes`) that pandas reads via `pd.read_html`. Without `lxml` those two series silently skip during `seed_market_prices.py`.

### 2.4) Seed price data and pre-warm forecasts

Without these, the Market Prices and Produce Prices tabs in the app will be empty / show "Network Error".

```bash
# Seed historical prices (market: ~5000 rows, produce: ~1000 rows)
python scripts/seed_market_prices.py
python scripts/seed_produce_prices.py

# Pre-train forecast models so the API responds in milliseconds instead of timing out.
# Each takes 5-15 minutes the first time.
python scripts/warmup_forecasts.py            # 29 livestock series x region SARIMA fits
python scripts/warmup_produce_forecasts.py    # 8 produce products with Prophet + LightGBM
```

> Without `warmup_*`, the forecast endpoints train on the first request — fine in theory, but the app's HTTP client times out before the model finishes, surfacing as "Network Error" in the UI. Once warmed, results are cached in `market_forecasts` / `produce_price_forecasts` and served instantly.

> If `seed_market_prices.py` reports "0 rows", make sure `AGRIO_MARKET_DATA_DIR=./app/modules/market_prices/raw` is set in `backend/.env` — the default `./data/market_prices/raw/` is empty (only contains placeholder files).

### 2.5) Verify backend is working

```bash
# Health check
curl http://localhost:8000/health

# Register a test user
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"

# Login
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d "{\"email\":\"test@test.com\",\"password\":\"Test1234\"}"
```

---

## 3) Frontend Setup

Run all commands from `frontend/`:

```bash
cd frontend
npm install
```

If PowerShell blocks `npm` script execution, use `npm.cmd install`.

### Run on Android

```bash
npx expo prebuild --platform android
npx expo run:android
```

> **Note:** `npx expo start` (Expo Go) will NOT work because the app uses native modules (`react-native-fast-tflite`). You must use `npx expo run:android`.

If Android SDK is not found, create `frontend/android/local.properties`:

```properties
sdk.dir=C:\\Users\\YOUR_USERNAME\\AppData\\Local\\Android\\Sdk
```

---

## 4) IoT Simulation (Wokwi ESP32)

The irrigation system uses an ESP32 that communicates with the backend via MQTT.

1. Open the Wokwi project (ask the team for the link or use the `sketch.txt` + `diagram.json` in the repo root)
2. Press **Play** to start the simulation
3. The ESP32 connects to `test.mosquitto.org` and publishes soil moisture values to `farm/soil_moisture`
4. The backend listens on the same MQTT topic and can send irrigation commands back to `farm/irrigation_command`

---

## 5) Testing the Full System

1. **Start PostgreSQL**: `cd backend && docker compose up -d`
2. **Start backend**: `cd backend && uvicorn app.main:app --reload`
3. **Start frontend**: `cd frontend && npx expo run:android`
4. **Start Wokwi simulation**: Press Play in the Wokwi editor

### In the app:
- **Sign Up** with an email and password
- **Log In** to reach the Dashboard
- **Water tab** (Irrigation): Press "Evaluate Field Now" to trigger the AI agent. It reads MQTT sensor data + weather forecast and decides whether to irrigate. Check the Wokwi Serial Monitor for `Pump ON` / `Pump OFF`.
- **Crop tab** (Disease Detection): Take or pick a photo of a plant leaf to get disease diagnosis and treatment advice
- **Autonomous Control toggle**: When enabled, the backend automatically checks irrigation every 6 hours

---

## App Features

| Feature | Screen | Backend API |
|---|---|---|
| User Auth | Login, Sign Up | `/api/v1/auth/` |
| Dashboard | Home tab | - |
| Irrigation | Water tab | `/api/v1/irrigation/` |
| Disease Detection | Crop tab | On-device TFLite model |
| Satellite/Land | Land tab | `/api/v1/satellite/` |
| Livestock (P&L, herd stats, vaccination reminders) | Livestock tab | `/api/v1/livestock/` |
| Market Prices (livestock SARIMA forecasts) | Market Prices tab | `/api/v1/market-prices/` |
| Produce Prices (fruits/vegetables Prophet + LightGBM) | Produce Prices tab | `/api/v1/produce-prices/` |
| Community (posts, comments) | Community tab | `/api/v1/community/` |
| Alerts (price alerts, vaccination reminders, push) | Alerts tab | `/api/v1/notifications/` |

---

## Project Structure

```
backend/
  app/
    api/v1/          # Route handlers (auth, irrigation, disease, etc.)
    middleware/       # Auth JWT middleware, CORS, logging
    modules/          # Business logic (auth, irrigation, ai, iot_gateway, etc.)
    persistence/      # Database engine, base model, session
    settings.py       # Pydantic settings (reads from backend.env / .env)
  docker-compose.yml  # PostgreSQL container
  backend.env         # Your local secrets (DO NOT COMMIT)
  .env.example        # Template for backend.env

frontend/
  src/
    core/             # Navigation, theme, stores, API client
    features/         # Feature modules (auth, dashboard, irrigation, diseaseDetection, etc.)
    bootstrap/        # App initialization, feature registration
  assets/model/       # TFLite model for disease detection
```

---

## Troubleshooting

### "Groq API key not set" or 500 error on Evaluate Field
Make sure `AGRIO_GROQ_API_KEY` is set in `backend/backend.env` (or `backend/.env`) with a valid key. Restart uvicorn after changing env values.

### "Failed to reach backend API" from the Android emulator
The emulator uses `10.0.2.2` to reach your host machine's `localhost`. This is already handled in `frontend/src/core/api/apiBaseUrl.ts`. If using a physical device, update the base URL to your computer's local IP address.

### Invalid character TS errors in language files
Text files were corrupted (null-byte content). Replace with clean UTF-8 text files.

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

### `expo-modules-core` linker errors: undefined symbols `__cxa_guard_acquire`, `std::logic_error`, vtable for `std::length_error`, etc.

**Symptom** — `npx expo run:android` fails during the C++ link step with hundreds of `ld.lld: error: undefined symbol` lines pointing at STL exception types and C++ ABI guards inside `expo-modules-core`.

**Cause** — Gradle picked **NDK 27.x**, which doesn't link the C++ shared STL the way `expo-modules-core` expects. The project requires **NDK 26.x**.

**Fix:**

1. Confirm NDK 26 is installed (Android Studio -> SDK Manager -> SDK Tools -> "NDK (Side by side)" -> check `26.1.10909125`). On Windows you can verify with PowerShell:
   ```powershell
   Get-ChildItem "$env:LOCALAPPDATA\Android\Sdk\ndk" -Directory | Select-Object Name
   ```
2. Pin the NDK version in `frontend/android/gradle.properties`. The `expo-root-project` plugin reads this property and applies it to the app **and** every native subproject (`expo-modules-core`, `react-native-fast-tflite`, `react-native-mmkv`, etc.) — so this single line is all you need:
   ```properties
   ndkVersion=26.1.10909125
   ```
   Add it at the bottom of the file. Do **not** try to override `ndkVersion` with a `subprojects { afterEvaluate { ... } }` block in `build.gradle` — by the time it runs, the Expo plugin has already evaluated the projects and Gradle will throw `Cannot run Project.afterEvaluate(Closure) when the project is already evaluated`.

3. Clean every C++ build cache (failed NDK 27 object files would otherwise be reused):
   ```cmd
   cd /d "frontend\android"
   gradlew.bat clean
   rmdir /s /q "..\node_modules\expo-modules-core\android\.cxx"
   rmdir /s /q "..\node_modules\react-native-fast-tflite\android\.cxx"
   rmdir /s /q "..\node_modules\react-native-mmkv\android\.cxx"
   cd /d "..\"
   npx expo run:android
   ```
   (`rmdir` will print "cannot find the file" if a `.cxx` folder doesn't exist — that's fine.)

4. The first log line of the build should now read `- ndk: 26.1.10909125`. If it still says 27, the property wasn't picked up — confirm `gradle.properties` was saved and that no Gradle daemon is reusing a cached config (`gradlew --stop` flushes it).

> **Note:** `frontend/android/` is regenerated by `npx expo prebuild`, which will wipe the patch above. Either re-apply it after every prebuild, or install [`expo-build-properties`](https://docs.expo.dev/versions/latest/sdk/build-properties/) and pin `android.ndkVersion` in `app.json` so Expo embeds the version into the regenerated files.

### Windows `Filename longer than 260 characters` or `std::format` C++ errors
If Android build fails in `safe-area-context` codegen or `expo-modules-core` with `x86_64` on Windows:

1. Keep New Architecture disabled:
   - `frontend/app.json` -> `"newArchEnabled": false`
   - `frontend/android/gradle.properties` -> `newArchEnabled=false`
2. Clean and rebuild:
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

### Docker Postgres port conflict
If port 5432 is already in use, stop the other Postgres or change the port in `docker-compose.yml`.

### `column "purchase_price" of relation "animals" does not exist` (or any "column does not exist" after a branch switch)

**Cause:** `Base.metadata.create_all()` only creates tables that don't exist yet — it does NOT add new columns to existing tables. If you ran the backend on an older branch first (without `purchase_price`, `purchase_date`, `region`, etc.), then switched to this branch, the tables exist but their columns are stale. Alembic has been stamped to head so it won't fix it either.

**Fix — wipe the volume and rebuild:**
```bash
cd backend
docker compose down -v
docker compose up -d
python -c "import asyncio; from app.persistence.db import init_models; asyncio.run(init_models())"
alembic stamp head
python scripts/seed_market_prices.py
python scripts/seed_produce_prices.py
```
You'll lose any test users/animals you created — re-register through the app.

### Push notifications never arrive on the Android emulator

**Cause:** Expo push notifications use Firebase Cloud Messaging (FCM), which requires Google Play Services. Most default Android emulator images don't include Google Play, so `Notifications.getExpoPushTokenAsync()` throws an error, the `registerPushToken()` call silently catches it and returns null, and `device_push_tokens` stays empty. The backend still reports `triggered: 1` because the alert fired — but the push channel skips sending when no tokens are registered.

**How to confirm:**
```powershell
docker exec -it agrio_postgres psql -U postgres -d agrio -c "SELECT user_id, platform FROM device_push_tokens;"
```
If this returns `(0 rows)` after you've logged in on the app, this is your problem.

**Fix — pick one:**
- **Use a physical Android phone** (best, 10 min): plug in via USB, enable Developer Options + USB debugging, run `npx expo run:android`. Real phones always have Play Services.
- **Create a Google Play emulator** (15 min): Android Studio → Device Manager → Create Device → on the System Image step, pick a target labeled **"Android XX (Google Play)"** (with the Play Store icon — NOT "Google APIs"). Default emulator images use the latter.

After either fix, log in on the app, **grant the notification permission prompt**, then re-check the SQL query — you should see one row.

### `Postgres connection_lost` immediately after `docker compose up -d`

The Postgres container accepts TCP connections a moment before it's actually ready to serve queries. One-shot scripts like `python -c "...init_models..."` race ahead and crash with `ConnectionError: unexpected connection_lost() call`. Wait ~3 seconds before any DB-touching command, or check with:
```bash
docker exec agrio_postgres pg_isready -U postgres
```

---

## Quick Start (TL;DR)

```bash
git lfs install
git clone https://github.com/hendch/Esprit-PIDS-4DS2-2026-agrio.git
cd Esprit-PIDS-4DS2-2026-agrio

# Backend
cd backend
docker compose up -d
cp .env.example backend.env
# Edit backend.env: set AGRIO_JWT_SECRET and AGRIO_GROQ_API_KEY
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -e ".[dev]"
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npx expo prebuild --platform android
npx expo run:android
```
