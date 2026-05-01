import Constants, { ExecutionEnvironment } from "expo-constants";

/**
 * `true` na app **Expo Go** (cliente da loja). Não inclui módulos nativos da app nem push remoto (SDK 53+).
 * Development builds (`expo run` / EAS dev client) → `false`.
 */
export function isExpoGo(): boolean {
  return Constants.executionEnvironment === ExecutionEnvironment.StoreClient;
}
