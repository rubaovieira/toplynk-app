# ROADMAP — toplynk

Indice YAML (sprints planejadas). Detalhe por sprint nas secoes abaixo.

```yaml
sprints:
  - id: 1
    nome: "Scaffold Expo + navegacao + placeholders alinhados ao doc"
    status: concluida
  - id: 2
    nome: "Onboarding e entrevista Fase 1 (perguntas base)"
    status: planejada
  - id: 3
    nome: "Entrevista Fase 2 dinamica + integracao IA (backend ou edge)"
    status: planejada
  - id: 4
    nome: "Perfil semantico, embeddings e persistencia"
    status: planejada
  - id: 5
    nome: "Feed de cards, ordenacao e swipe (like/pass)"
    status: planejada
  - id: 6
    nome: "Match mutuo, tela de match e revelacao WhatsApp"
    status: planejada
  - id: 7
    nome: "Geolocalizacao, radar e notificacoes (limites anti-spam)"
    status: planejada
  - id: 8
    nome: "Cache de scores, batch e performance"
    status: planejada
```

## Sprint 1 — Scaffold Expo + navegacao

- App em `apps/mobile` (Expo, TypeScript).
- Rotas alinhadas ao fluxo do documento: entrevista → discovery (cards) → match.
- Criterio de aceite: `npx expo start` sobe sem erro; telas placeholder com titulos do fluxo.

## Sprint 2 — Entrevista Fase 1

- Implementar P1–P5 do documento (objetivo, momento, area, disponibilidade, raio).
- Estado local ou API conforme decisao do `/arquiteto`.

## Sprint 3 em diante

Ver secoes 2–8 de `ARQUITETURA_MATCHING_IA (1).md` (IA dinamica, perfil, score, notificacoes, cache).
