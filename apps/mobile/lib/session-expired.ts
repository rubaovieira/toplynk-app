/**
 * Tratamento global de sessão expirada.
 *
 * O token JWT tem validade (hoje 7 dias) e não há refresh. Antes, quando o token
 * expirava o app continuava se achando "logado" (o token seguia salvo) e disparava
 * requisições autenticadas que voltavam 401 em cadeia — a Home caía em "falha ao
 * carregar", dando a impressão de que o backend estava fora do ar. O usuário ficava
 * preso sem forma de recuperar sem reinstalar.
 *
 * Agora, qualquer requisição autenticada que receba 401 dispara `notifyUnauthorized()`,
 * que limpa a sessão e redireciona para o login. O disparo é único até o próximo login
 * (várias chamadas podem receber 401 ao mesmo tempo, mas só uma efetua logout+redirect).
 */

type UnauthorizedHandler = () => void;

let handler: UnauthorizedHandler | undefined;
let triggered = false;

/** Registrado uma vez pelo `RootLayout` (limpa sessão + redireciona para /login). */
export function setUnauthorizedHandler(fn: UnauthorizedHandler | undefined): void {
  handler = fn;
}

/** Rearma o disparo. Chamar após um login bem-sucedido (novo token válido). */
export function resetUnauthorized(): void {
  triggered = false;
}

/**
 * Chamado quando uma requisição autenticada recebe 401 (token expirado/inválido).
 * Idempotente: só o primeiro 401 até o próximo login efetua logout+redirect.
 */
export function notifyUnauthorized(): void {
  if (triggered) return;
  triggered = true;
  handler?.();
}
