import { File } from 'expo-file-system';

import i18n from '@/lib/i18n';

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]!);
  }
  if (typeof globalThis.btoa !== 'function') {
    throw new Error(i18n.t('errors.btoaUnavailable'));
  }
  return globalThis.btoa(binary);
}

/** Converte URIs locais (ImagePicker) em data URLs JPEG para enviar no perfil. */
export async function encodePhotoSlotsToBase64(slots: (string | null)[]): Promise<string[]> {
  const out: string[] = [];
  for (const uri of slots) {
    if (!uri) continue;
    const file = new File(uri);
    const buffer = await file.arrayBuffer();
    const base64 = arrayBufferToBase64(buffer);
    out.push(`data:image/jpeg;base64,${base64}`);
  }
  return out;
}
