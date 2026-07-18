import * as Updates from "expo-updates";

let checking = false;

/**
 * Por padrão o expo-updates só aplica um update já baixado no próximo cold start.
 * Sem isto, quem abre o app uma única vez após instalar/atualizar vê o bundle antigo
 * embutido no binário e conclui (errado) que o OTA não chegou.
 */
export async function applyPendingUpdateAsync(): Promise<void> {
  if (!Updates.isEnabled || checking) return;
  checking = true;
  try {
    const check = await Updates.checkForUpdateAsync();
    if (!check.isAvailable) return;
    const fetched = await Updates.fetchUpdateAsync();
    if (fetched.isNew) {
      await Updates.reloadAsync();
    }
  } catch {
    // Sem conexão ou servidor de updates indisponível — segue com o bundle atual.
  } finally {
    checking = false;
  }
}
