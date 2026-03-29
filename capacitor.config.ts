import type { CapacitorConfig } from "@capacitor/cli";

/**
 * Full-stack Next.js cannot ship API routes inside the APK. The WebView loads your deployed app.
 *
 * Development (Android emulator → host machine):
 *   set CAPACITOR_SERVER_URL=http://10.0.2.2:3000
 * Physical device on same LAN:
 *   set CAPACITOR_SERVER_URL=http://YOUR_PC_LAN_IP:3000
 * Production:
 *   set CAPACITOR_SERVER_URL=https://your-domain.com
 */
const serverUrl = process.env.CAPACITOR_SERVER_URL?.trim();

const config: CapacitorConfig = {
  appId: "com.posstudio.app",
  appName: "POS Studio",
  webDir: "capacitor/www",
  ...(serverUrl
    ? {
        server: {
          url: serverUrl,
          cleartext: serverUrl.startsWith("http://"),
        },
      }
    : {}),
  android: {
    allowMixedContent: true,
  },
};

export default config;
