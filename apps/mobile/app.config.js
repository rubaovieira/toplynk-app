/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Config dinâmica: OneSignal (primeiro na lista de plugins) + notificações + `extra.eas.projectId` via env (EAS).
 * Mantém o resto em sync com app.json.
 */
const appJson = require("./app.json");

/** EAS não grava em `app.config.js`; mantém o link ao projeto na nuvem. Sobrescreva com `EAS_PROJECT_ID` se precisar. */
// Temporarily unset default EAS project ID so `eas init` can create/associate
// a new project under the current logged-in account. Restore or remove
// this default if you want to link to a specific existing project.
const DEFAULT_EAS_PROJECT_ID = "";

const oneSignalAppId =
  (process.env.EXPO_PUBLIC_ONESIGNAL_APP_ID || "").trim() ||
  (appJson.expo.extra?.oneSignalAppId || "").trim() ||
  "";

/** APNs: `development` vs `production` — alinhar com certificados / perfil EAS (`ONESIGNAL_APS_ENV=production` em builds de loja). */
const oneSignalPluginMode =
  process.env.ONESIGNAL_APS_ENV === "production" ? "production" : "development";

/**
 * IDs nativos explícitos: sem isto, o `expo prebuild` sugere `com.<owner>.<slug>` e, se esse pacote
 * já existir na Play Store, pede confirmação interativa — em alguns terminais o comando termina
 * logo com exit 1 sem mensagem visível. Sobrescreva com `ANDROID_PACKAGE` / `IOS_BUNDLE_ID`.
 */
const androidPackage =
  (process.env.ANDROID_PACKAGE || "").trim() || "com.obora.toplynk";
const iosBundleIdentifier =
  (process.env.IOS_BUNDLE_ID || "").trim() || "com.rubens.toplynkapp";

module.exports = () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    ios: {
      ...appJson.expo.ios,
      bundleIdentifier: iosBundleIdentifier,
      infoPlist: {
        ...(appJson.expo.ios?.infoPlist || {}),
        ITSAppUsesNonExemptEncryption: false,
      },
    },
    android: {
      ...appJson.expo.android,
      package: androidPackage,
    },
    plugins: [
      [
        "onesignal-expo-plugin",
        {
          mode: oneSignalPluginMode,
        },
      ],
      ...(appJson.expo.plugins || []),
      [
        "expo-notifications",
        {
          icon: "./assets/images/icon.png",
          color: "#0A84FF",
        },
      ],
    ],
    extra: {
      ...(appJson.expo.extra || {}),
      ...(oneSignalAppId ? { oneSignalAppId } : {}),
      eas: {
        ...(appJson.expo.extra?.eas || {}),
        projectId:
          process.env.EAS_PROJECT_ID ||
          appJson.expo.extra?.eas?.projectId ||
          DEFAULT_EAS_PROJECT_ID,
      },
    },
  },
});
