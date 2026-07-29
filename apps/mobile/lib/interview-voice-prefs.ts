import AsyncStorage from "@react-native-async-storage/async-storage";

const TTS_ENABLED_KEY = "@toplynk/interview_tts_enabled";

/**
 * Se o usuário silenciou a voz do assistente.
 *
 * Persistido para sobreviver a um restart no meio da entrevista — quem
 * silenciou porque está no transporte não quer o áudio voltando sozinho.
 */
export async function getInterviewTtsEnabled(): Promise<boolean> {
  try {
    const raw = await AsyncStorage.getItem(TTS_ENABLED_KEY);
    return raw === null ? true : raw === "true";
  } catch {
    return true;
  }
}

export async function setInterviewTtsEnabled(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(TTS_ENABLED_KEY, enabled ? "true" : "false");
  } catch {
    /* preferência é best-effort */
  }
}
