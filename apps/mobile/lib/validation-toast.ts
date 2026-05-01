type ToastListener = (message: string) => void;

let listener: ToastListener | null = null;

/** Usado por `ValidationToastHost` em `app/_layout.tsx`. */
export function setValidationToastListener(fn: ToastListener | null) {
  listener = fn;
}

/** Mensagem de validação no topo (toast nativo leve, sem dependência extra). */
export function showValidationToast(message: string) {
  listener?.(message);
}
