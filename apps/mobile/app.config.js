/* eslint-disable @typescript-eslint/no-require-imports */
/**
 * Config dinâmica: plugin de notificações + `extra.eas.projectId` via env (EAS).
 * Mantém o resto em sync com app.json.
 */
const appJson = require('./app.json');

/** EAS não grava em `app.config.js`; mantém o link ao projeto na nuvem. Sobrescreva com `EAS_PROJECT_ID` se precisar. */
const DEFAULT_EAS_PROJECT_ID = '4ec0035f-bdad-44a7-a41b-1f1ef019d02f';

module.exports = () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins || []),
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#0A84FF',
        },
      ],
    ],
    extra: {
      ...(appJson.expo.extra || {}),
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
