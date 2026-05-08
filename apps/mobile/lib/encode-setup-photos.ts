import i18n from '@/lib/i18n';

async function uriToBase64(uri: string): Promise<string> {
  // For web and expo web
  if (uri.startsWith('data:')) {
    return uri.split(',')[1] || '';
  }

  // Fetch and convert to base64
  const response = await fetch(uri);
  const blob = await response.blob();
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      const base64 = dataUrl.split(',')[1];
      if (base64) {
        resolve(base64);
      } else {
        reject(new Error('Failed to convert to base64'));
      }
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/** Converte URIs locais (ImagePicker) em data URLs JPEG para enviar no perfil. */
export async function encodePhotoSlotsToBase64(slots: (string | null)[]): Promise<string[]> {
  const out: string[] = [];
  for (const uri of slots) {
    if (!uri) continue;
    try {
      const base64 = await uriToBase64(uri);
      out.push(`data:image/jpeg;base64,${base64}`);
    } catch (e) {
      throw new Error(
        e instanceof Error ? e.message : i18n.t('errors.photoConversionFailed')
      );
    }
  }
  return out;
}
