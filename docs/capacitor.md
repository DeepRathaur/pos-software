# Capacitor / Android

The web app runs in the browser as usual. The **Android** folder is a Capacitor shell that loads your app in a WebView.

## Why `CAPACITOR_SERVER_URL`?

This project is **full-stack Next.js** (`/api/*` routes + database). Those APIs are **not** bundled into the APK. The native app must load a URL where **Next.js is already deployed** (or running on your dev machine).

Set the environment variable **before** `npx cap sync` so the baked `capacitor.config.json` includes `server.url`:

| Scenario | Example |
|----------|---------|
| Android emulator, Next on same PC (`npm start`) | `http://10.0.2.2:3000` |
| Physical phone on same Wi‑Fi | `http://YOUR_PC_LAN_IP:3000` |
| Production | `https://your-domain.com` |

**PowerShell (Windows):**

```powershell
$env:CAPACITOR_SERVER_URL="http://10.0.2.2:3000"
npx cap sync
```

**HTTP** URLs set `cleartext: true` automatically (needed for local dev). Use **HTTPS** in production.

If you omit `CAPACITOR_SERVER_URL`, the WebView falls back to bundled assets under `capacitor/www` (placeholder only — not the full Next app).

## Workflow

1. Deploy or run Next (`npm run build && npm start` or your host).
2. Set `CAPACITOR_SERVER_URL` and run `npm run android:sync` (or `npx cap sync`).
3. Open the project: `npm run android:open` (opens Android Studio).
4. Build **Run** ▶ or **Build → Build Bundle(s) / APK(s)**.

CLI debug APK (from repo root, after sync):

```powershell
cd android
.\gradlew.bat assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/app-debug.apk`.

## JDK requirement

Use **JDK 17** or **JDK 21** for Gradle / Android Gradle Plugin. If you see `Unsupported class file major version 68`, your default Java is too new (e.g. Java 24) — install JDK 21, then set `JAVA_HOME` to it and rebuild.

## Plugins (optional)

1. Add `@capacitor/*` packages as needed (`barcode-scanner`, `camera`, `local-notifications`, `share`, etc.).
2. Implement the stubs in `src/lib/capacitor/index.ts` when `Capacitor.isNativePlatform()` is true.
3. Offline queue (`sync_queue`) still syncs to your deployed Next API.

**Barcode on web:** hardware scanners that type into the POS search field (including `?barcode=`) work without a plugin.

## npm scripts

| Script | Purpose |
|--------|---------|
| `npm run android:sync` | Copy web assets + config into `android/` |
| `npm run android:open` | Open Android Studio |
| `npm run android:run` | Sync and run on a device/emulator (needs SDK / device) |
