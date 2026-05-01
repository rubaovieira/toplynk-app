# Toplynk — guia de produção

Este documento resume como colocar o projeto em produção com foco na **API NestJS** (`apps/api`), base de dados **PostgreSQL com pgvector**, **Redis** (Socket.IO / chat) e o que precisas de configurar no **app mobile**.

---

## 1. Backend com Docker (recomendado para homologação ou VPS)

Na pasta `apps/api` existe um `docker-compose.yml` que sobe:

- **postgres** — imagem `pgvector/pgvector:pg16` (utilizador e base `toplynk`, senha predefinida `toplynk` só para desenvolvimento local em Docker).
- **redis** — persistência AOF para estado de adaptador Socket.IO.
- **api** — imagem construída pelo `Dockerfile` (Node 22, migrações TypeORM no arranque por predefinição).

### Passos rápidos

1. Cria `apps/api/.env` a partir de `apps/api/.env.example` e define pelo menos **`JWT_SECRET`** (string longa e aleatória). Em produção real, o arranque falha sem este valor quando `NODE_ENV=production`. O `docker-compose.yml` usa `env_file: .env` — o ficheiro tem de existir (mesmo que só com `JWT_SECRET=...` e o resto herdado do exemplo).
2. Opcional: `OPENAI_API_KEY` e `OPENAI_MODEL` se usares a entrevista IA no servidor.
3. Na raiz da pasta da API:

```bash
cd apps/api
cp .env.example .env
# edita .env — JWT_SECRET obrigatório; OPENAI_* se precisares

docker compose up -d --build
```

4. Verifica saúde: `GET http://localhost:3000/health` (ou a porta definida em `API_PORT`).

### Variáveis úteis no host (opcional)

| Variável        | Predefinição | Descrição                          |
|-----------------|--------------|-------------------------------------|
| `API_PORT`      | `3000`       | Porta publicada do contentor API.   |
| `POSTGRES_PORT` | `5432`       | Porta publicada do Postgres.        |
| `REDIS_PORT`    | `6379`       | Porta publicada do Redis.           |

### Migrações na base de dados

Por predefinição o contentor **api** executa `migration:run` antes de iniciar o Node (`RUN_MIGRATIONS_ON_START=true`). Para desativar (por exemplo, correres migrações num job de CI/CD separado):

```yaml
# em docker-compose.yml, secção api.environment:
RUN_MIGRATIONS_ON_START: "false"
```

Migração manual dentro do contentor:

```bash
docker compose exec api node ./node_modules/typeorm/cli.js migration:run -d ./dist/data-source.js
```

### Segurança em produção real

- Altera **credenciais do Postgres** e **URL do Redis**: hoje o compose fixa `DB_USER` / `DB_PASSWORD` no serviço `api` para coincidir com o serviço `postgres`. Para produção, usa segredos geridos (Docker secrets, Kubernetes secrets, variáveis do teu PaaS) e remove senhas em texto plano do ficheiro de compose versionado.
- Coloca a API atrás de **HTTPS** (reverse proxy: Caddy, Traefik, Nginx, load balancer cloud).
- Restringe **CORS** em `apps/api/src/main.ts` (`enableCors`) a origens conhecidas em vez de `origin: true`.
- Garante **backups** periódicos do volume Postgres (`toplynk_pgdata`).

---

## 2. API sem Docker (Node em VM ou PaaS)

1. Instala Node.js 22+ (ou a versão alinhada com o `Dockerfile`).
2. Postgres 16+ com extensão **pgvector** (mesmo requisito que o compose).
3. Redis acessível pela URL em `REDIS_URL`.
4. `cd apps/api && npm ci && npm run build`
5. `npm run migration:run:prod` antes ou no deploy.
6. `npm run start:prod` (ou `node dist/main.js` com `NODE_ENV=production`).

Variáveis essenciais: as de `apps/api/.env.example` (`DB_*`, `REDIS_URL`, `JWT_SECRET`, etc.).

---

## 3. App mobile (Expo)

- Aponta o cliente HTTP / WebSocket para a **URL pública HTTPS** da API (não uses `http://localhost` em builds de dispositivo real).
- Configura variáveis de ambiente do EAS / `app.config` conforme o projeto (por exemplo `EXPO_PUBLIC_API_URL` se existir no teu `lib/api-config.ts`).
- Garante que o certificado TLS é válido e que firewalls permitem tráfego à porta exposta pelo proxy.

---

## 4. Checklist antes de abrir tráfego público

- [ ] `JWT_SECRET` forte e exclusivo por ambiente.
- [ ] Postgres e Redis não expostos à internet sem necessidade (firewall / rede privada).
- [ ] Migrações aplicadas e smoke test em `/health`.
- [ ] Push notifications (se usadas): chaves FCM/APNs e registo de tokens alinhados com o backend.
- [ ] Limites de body (`REQUEST_BODY_LIMIT`) adequados se enviares fotos em base64.

---

## 5. Onde está o código

| Componente | Caminho        |
|-----------|----------------|
| API       | `apps/api`     |
| Mobile    | `apps/mobile`  |

Para só infraestrutura (Postgres + Redis) sem reconstruir a API:

```bash
cd apps/api
docker compose up -d postgres redis
```
