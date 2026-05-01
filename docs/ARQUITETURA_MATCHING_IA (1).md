# 🧠 ARQUITETURA DE MATCHING INTELIGENTE

---

## 1. VISÃO GERAL DO SISTEMA

### Objetivo
Conectar profissionais próximos geograficamente com base em **complementaridade de objetivos** usando IA para análise de perfil e cálculo de compatibilidade.

### Fluxo Principal
```
Usuário completa entrevista
    ↓
IA analisa respostas e gera perfil semântico
    ↓
Sistema calcula compatibilidade com outros usuários próximos
    ↓
Apresenta cards ordenados por score
    ↓
Swipe → Match → WhatsApp revelado
```

---

## 2. ENTREVISTA INTELIGENTE

### 2.1 Estrutura em Fases

#### **FASE 1: Perguntas Base (3-5 perguntas - TODOS respondem)**

Objetivo: Definir categoria principal e contexto básico

**P1 - Objetivo Principal**
- "O que você busca aqui?"
- Opções múltiplas:
  - Encontrar clientes para meu serviço/produto
  - Contratar profissionais/fornecedores
  - Parcerias estratégicas
  - Investimento para meu negócio
  - Investir em negócios/startups
  - Networking em geral

**P2 - Momento Profissional**
- "Qual seu momento profissional atual?"
- Opção única:
  - Iniciando carreira/negócio
  - Crescendo/escalando
  - Consolidado, buscando novas oportunidades
  - Transição de carreira/pivô

**P3 - Área de Atuação**
- "Qual sua área principal?"
- Texto livre com sugestões:
  - Tecnologia/Desenvolvimento
  - Vendas/Comercial
  - Marketing
  - Finanças/Contabilidade
  - Jurídico
  - Operações/Logística
  - RH/Pessoas
  - Produto/Design
  - Consultoria/Estratégia
  - (permite escrever outra)

**P4 - Disponibilidade**
- "Como você prefere trabalhar/conectar?"
- Opção única:
  - Presencial (encontros pessoais)
  - Remoto (online)
  - Híbrido (ambos)

**P5 - Raio de Busca Preferencial**
- "Qual distância você considera ideal?"
- Opção única:
  - Muito próximo (até 2km)
  - Próximo (até 5km)
  - Mesma região (até 10km)
  - Cidade inteira (até 50km)
  - Sem preferência

---

#### **FASE 2: Perguntas Contextuais (5-7 perguntas - IA gera dinamicamente)**

A IA analisa respostas da Fase 1 e gera perguntas personalizadas.

**Exemplo 1: Usuário que busca CLIENTES**

- "Que tipo de solução/serviço você oferece?"
  - Texto livre

- "Qual o perfil de cliente ideal para você?"
  - Startups (até 50 funcionários)
  - PMEs (50-500 funcionários)
  - Grandes empresas (500+)
  - Pessoas físicas/Freelancers

- "Qual a faixa de valor típica dos seus projetos?"
  - Até R$ 5k
  - R$ 5k - R$ 20k
  - R$ 20k - R$ 100k
  - Acima de R$ 100k

- "O que te diferencia da concorrência?"
  - Texto livre (máx 200 caracteres)

- "Quais setores você atende melhor?"
  - Múltipla escolha ou texto livre

**Exemplo 2: Usuário que busca FORNECEDORES**

- "Que tipo de profissional/serviço você precisa?"
  - Texto livre

- "Qual o orçamento disponível?"
  - Até R$ 5k
  - R$ 5k - R$ 20k
  - R$ 20k - R$ 100k
  - Acima de R$ 100k

- "Urgência do projeto?"
  - Imediato (esta semana)
  - Curto prazo (este mês)
  - Médio prazo (próximos 3 meses)
  - Sem urgência

- "Critérios principais de escolha?"
  - Preço
  - Qualidade/Portfólio
  - Velocidade de entrega
  - Experiência em meu setor

**Exemplo 3: Usuário EMPREENDEDOR buscando INVESTIMENTO**

- "Em que estágio está seu negócio?"
  - Ideia/Validação
  - MVP desenvolvido
  - Primeiros clientes
  - Faturando/Escalando

- "Quanto busca captar?"
  - Até R$ 100k
  - R$ 100k - R$ 500k
  - R$ 500k - R$ 2M
  - Acima de R$ 2M

- "Setor do negócio?"
  - Texto livre

- "O que já foi validado?"
  - Texto livre (máx 300 caracteres)

---

#### **FASE 3: Refinamento (Opcional - 0-2 perguntas)**

Se IA detectar ambiguidade ou oportunidade de melhorar matching:

- "Você mencionou [X]. Pode detalhar um pouco mais?"
- "Vi que você busca [Y]. Isso é prioritário ou secundário?"

---

### 2.2 Sistema de Perguntas Dinâmicas (IA)

**Prompt para OpenAI (gerar perguntas Fase 2):**

```
CONTEXTO DO USUÁRIO:
- Objetivos: {lista de objetivos selecionados}
- Momento: {momento profissional}
- Área: {área de atuação}
- Disponibilidade: {presencial/remoto/híbrido}

TAREFA:
Você é um assistente de networking profissional. Gere 5-7 perguntas personalizadas 
para entender profundamente o que essa pessoa oferece e busca.

FOCO:
- Se busca CLIENTES: detalhes do serviço, perfil ideal, ticket, diferenciais
- Se busca FORNECEDORES: necessidade específica, orçamento, urgência, critérios
- Se busca PARCEIROS: tipo de parceria, complementaridade desejada, objetivos
- Se busca INVESTIMENTO: estágio, tração, valor, setor
- Se é INVESTIDOR: ticket, setores, estágio preferido, critérios

FORMATO:
Retorne JSON com array de perguntas, cada uma contendo:
- id: identificador único
- pergunta: texto da pergunta
- tipo: "text_free", "single_choice", "multiple_choice", "scale"
- opcoes: array (se aplicável)
- peso_matching: 1-10 (importância para calcular compatibilidade)

REGRAS:
- Linguagem clara, brasileira, profissional
- Perguntas diretas e acionáveis
- Não perguntar o que já foi respondido na Fase 1
- Cada pergunta deve gerar dados úteis para matching
```

---

## 3. GERAÇÃO DO PERFIL SEMÂNTICO

### 3.1 Processamento das Respostas

Após usuário completar entrevista, sistema envia todas respostas para IA.

**Prompt para OpenAI (análise de perfil):**

```
RESPOSTAS COMPLETAS DO USUÁRIO:
{JSON com todas respostas - Fase 1 + Fase 2}

TAREFA:
Analise as respostas e gere um perfil semântico estruturado que será usado 
para calcular compatibilidade com outros profissionais.

FORMATO DE SAÍDA (JSON):
{
  "categoria_principal": "prestador_servico | comprador | investidor | empreendedor | parceiro",
  
  "subcategoria": "descrição específica do que faz",
  
  "oferece": {
    "servicos": ["lista de serviços oferecidos"],
    "produtos": ["lista de produtos, se aplicável"],
    "expertise": ["áreas de conhecimento/experiência"],
    "valor_agregado": "o que torna essa pessoa única"
  },
  
  "busca": {
    "tipo_conexao": ["cliente", "fornecedor", "parceiro", "investidor"],
    "perfil_ideal": "descrição do match perfeito",
    "criterios_importantes": ["lista de critérios"],
    "ticket_medio": "faixa de valor",
    "urgencia": "imediato | curto_prazo | medio_prazo | sem_urgencia"
  },
  
  "contexto": {
    "momento_carreira": "fase atual",
    "disponibilidade": "presencial | remoto | hibrido",
    "raio_preferencial": "distância em km",
    "setores_interesse": ["lista de setores"]
  },
  
  "soft_skills": ["lideranca", "execucao", "estrategia", "inovacao", ...],
  
  "palavras_chave": ["keywords importantes para matching semântico"],
  
  "resumo_publico": "Texto de 2-3 frases que aparecerá no card (tom profissional, direto)"
}

REGRAS:
- Seja específico e objetivo
- Use linguagem comercial/profissional
- Extraia informações implícitas das respostas
- Identifique complementaridades óbvias
- O resumo_publico deve ser atrativo mas honesto
```

---

### 3.2 Embedding Semântico

Após gerar perfil estruturado, sistema cria representação vetorial para similarity search.

**Texto consolidado para embedding:**
```
{categoria_principal}
{subcategoria}
Oferece: {todos serviços, produtos, expertise}
Busca: {tipo_conexao} - {perfil_ideal}
Contexto: {momento_carreira}, {setores_interesse}
Palavras-chave: {palavras_chave}
```

Enviar para **OpenAI Embeddings API** → gera vetor de 1536 dimensões

Armazenar vetor para comparação futura (cosine similarity)

---

## 4. ALGORITMO DE MATCHING

### 4.1 Componentes do Score (0-100)

```
SCORE FINAL = 
  (Complementaridade de Objetivos × 35%) +
  (Compatibilidade Semântica × 25%) +
  (Proximidade Geográfica × 20%) +
  (Alinhamento de Momento × 10%) +
  (Interesses Comuns × 10%)
```

---

### 4.2 Detalhamento dos Componentes

#### **1. COMPLEMENTARIDADE DE OBJETIVOS (35%)**

Verifica se o que um oferece é o que o outro busca.

**Matriz de Compatibilidade:**

| Usuário A      | Usuário B     | Score |
|----------------|---------------|-------|
| Prestador (busca cliente) | Comprador (busca fornecedor) | 95 |
| Empreendedor (busca invest) | Investidor (busca startup) | 90 |
| Parceiro (área X) | Parceiro (área Y complementar) | 75 |
| Prestador (área X) | Prestador (área X) | 30 |
| Comprador | Comprador | 20 |

**Lógica:**
- Verifica `categoria_principal` de ambos
- Cruza com `busca.tipo_conexao`
- Verifica complementaridade de `oferece` vs `busca.perfil_ideal`
- Checa compatibilidade de `ticket_medio` (vendedor × comprador)

**Exemplo:**
- A oferece "Desenvolvimento de apps" e busca "Clientes PME, ticket R$20k-100k"
- B busca "Desenvolvedor para app" e tem "Orçamento R$50k"
- Compatibilidade: ALTA → Score 95

---

#### **2. COMPATIBILIDADE SEMÂNTICA (25%)**

Usa embeddings para medir similaridade entre perfis.

**Processo:**
1. Pegar embedding_vector de ambos usuários
2. Calcular **cosine similarity** entre vetores
3. Normalizar para escala 0-100

**Fórmula:**
```
similarity = dot_product(vector_a, vector_b) / (norm(vector_a) × norm(vector_b))
score_semantico = similarity × 100
```

**O que captura:**
- Linguagem similar nas respostas
- Setores/áreas relacionadas
- Objetivos alinhados semanticamente
- Expertise complementares

---

#### **3. PROXIMIDADE GEOGRÁFICA (20%)**

Quanto mais perto, maior o score.

**Escala:**
```
Distância         | Score
------------------|------
< 500m            | 100
500m - 2km        | 80
2km - 5km         | 60
5km - 10km        | 40
10km - 50km       | 20
> 50km            | 0
```

**Ajuste por preferência:**
- Se usuário escolheu "Muito próximo" → multiplicador 1.5 para distâncias < 2km
- Se escolheu "Sem preferência" → score normalizado (menos peso)

**Cálculo:**
```
distancia_metros = calcular_distancia(lat_a, lng_a, lat_b, lng_b)
score_base = tabela_acima[distancia_metros]
score_ajustado = score_base × multiplicador_preferencia
```

---

#### **4. ALINHAMENTO DE MOMENTO (10%)**

Verifica se momentos de carreira são compatíveis.

**Matriz:**

| Momento A      | Momento B     | Score |
|----------------|---------------|-------|
| Consolidado | Iniciando | 85 (mentor/mentorado) |
| Crescendo | Investidor | 90 |
| Iniciando | Iniciando | 60 (pares) |
| Crescendo | Crescendo | 70 (pares evoluindo) |
| Consolidado | Consolidado | 75 (expertise similar) |
| Transição | Qualquer | 50 (contexto instável) |

---

#### **5. INTERESSES COMUNS (10%)**

Baseado em setores, soft skills, palavras-chave.

**Cálculo:**
```
interesses_a = setores + soft_skills + palavras_chave (usuário A)
interesses_b = setores + soft_skills + palavras_chave (usuário B)

comuns = interseção(interesses_a, interesses_b)
total = união(interesses_a, interesses_b)

score = (comuns.length / total.length) × 100
```

---

### 4.3 Exemplo Prático de Cálculo

**Usuário A - João (Dev Freelancer):**
```
categoria: prestador_servico
oferece: Desenvolvimento de apps, MVP startups
busca: Clientes PME, ticket R$20k-R$100k
momento: Crescendo
localizacao: Botafogo, Rio (-22.9519, -43.1816)
interesses: [tech, startups, mobile, ia]
```

**Usuário B - Maria (CEO Startup):**
```
categoria: comprador
busca: Desenvolvedor para refazer app mobile
ticket: R$50k
momento: Crescendo
localizacao: Botafogo, Rio (-22.9488, -43.1847)
interesses: [tech, startups, fintech, produto]
```

**Cálculo:**

1. **Complementaridade:** 
   - Prestador busca cliente × Comprador busca fornecedor = 95
   - Ticket compatível (R$50k dentro de R$20-100k) = mantém 95
   - **95 × 0.35 = 33.25**

2. **Semântica:**
   - Embedding similarity = 0.78 (alta similaridade semântica)
   - **78 × 0.25 = 19.50**

3. **Proximidade:**
   - Distância: ~350m
   - Score: 100
   - **100 × 0.20 = 20.00**

4. **Momento:**
   - Ambos "Crescendo" = 70
   - **70 × 0.10 = 7.00**

5. **Interesses:**
   - Comuns: [tech, startups] = 2
   - Total: [tech, startups, mobile, ia, fintech, produto] = 6
   - Score: (2/6) × 100 = 33.33
   - **33.33 × 0.10 = 3.33**

**SCORE FINAL = 33.25 + 19.50 + 20.00 + 7.00 + 3.33 = 83.08**

**Resultado:** Match prioritário, alta compatibilidade

---

## 5. SISTEMA DE NOTIFICAÇÕES INTELIGENTES

### 5.1 Quando Notificar

**Trigger 1: Radar de Proximidade**
- A cada 15 minutos, sistema verifica usuários com `radar_ativo = true`
- Cruza geolocalização atual com outros usuários ativos
- Se detectar usuário compatível (score > 70) a menos de 2km → notifica

**Trigger 2: Novo Match de Alta Qualidade**
- Quando sistema calcula score > 85 com alguém próximo
- Mesmo que não esteja no mesmo local no momento

**Trigger 3: Match Mútuo (Swipe)**
- Quando ambos dão like → notificação instantânea

---

### 5.2 Tipos de Notificação

**Push Notification (Prioritário):**
```
🔥 2 profissionais compatíveis próximos!
[Abrir app]
```

**E-mail (Backup/Resumo Diário):**
```
Assunto: Você tem 5 novas conexões potenciais

Olá João,

Encontramos 5 profissionais próximos que combinam com seu perfil:

1. Maria Silva - CEO Startup Fintech (87% compatibilidade, 1.2km)
2. Pedro Costa - Investidor Anjo (82% compatibilidade, 3.5km)
...

[Ver no app]
```

**WhatsApp (Futuro - alta urgência):**
```
🎯 NetMatch: Profissional compatível a 500m de você! Abra o app.
```

---

### 5.3 Regras Anti-Spam

- Máximo 3 notificações push por dia (exceto matches confirmados)
- Não notificar entre 22h-8h (modo silencioso)
- Se usuário ignorar 5 sugestões seguidas → reduzir frequência
- Respeitar configuração de "não perturbar"

---

## 6. FLUXO DO USUÁRIO NO APP

### 6.1 Feed de Cards (Tela Principal)

**Ordenação:**
1. Pessoas próximas AGORA (< 2km, online) → topo
2. Score alto (> 80) mesmo que mais longe
3. Score médio (60-80) próximas
4. Demais por score decrescente

**Informações no Card:**
```
┌─────────────────────────┐
│  [Foto]                 │
│                         │
│  Maria Silva, 34        │
│  CEO • Startup Fintech  │
│                         │
│  📍 A 1.2km de você     │
│  🔥 87% compatível      │
│                         │
│  "Busco desenvolvedor   │
│   para refazer app..."  │
│                         │
│  💡 Match porque:       │
│  • Você oferece o que   │
│    ela busca            │
│  • Orçamento alinhado   │
│  • Mesma região         │
└─────────────────────────┘
   [❌]         [💚]
  PASS         LIKE
```

---

### 6.2 Ação: Swipe

**Swipe Left (Pass):**
- Registra no histórico
- Não mostra esse perfil novamente
- Próximo card aparece

**Swipe Right (Like):**
- Registra interesse
- Verifica se outro usuário já deu like
  - **SIM → MATCH!**
    - Exibe tela de match
    - Revela WhatsApp de ambos
    - Envia notificação para o outro
  - **NÃO → Aguarda**
    - Próximo card aparece
    - Se outro der like depois, notifica

---

### 6.3 Tela de Match

```
┌─────────────────────────┐
│                         │
│   🎉 VOCÊ DEU MATCH!    │
│                         │
│    [Sua foto] ❤️ [Foto  │
│                  dela]  │
│                         │
│  Maria Silva            │
│  CEO • Startup Fintech  │
│                         │
│  📱 WhatsApp revelado:  │
│  +55 21 99999-9999      │
│                         │
│  💡 Sugestão de início: │
│  "Maria busca exatamente│
│   o que você oferece.   │
│   Que tal enviar uma    │
│   mensagem apresentando │
│   seu portfólio?"       │
│                         │
│  [Abrir WhatsApp]       │
│  [Ver Perfil Completo]  │
└─────────────────────────┘
```

---

## 7. OTIMIZAÇÕES E CACHE

### 7.1 Cache de Compatibilidade

**Problema:** Calcular score em tempo real para milhares de combinações é lento.

**Solução:** Pre-calcular scores.

**Processo:**
1. A cada 1 hora (batch noturno), sistema roda:
   - Para cada usuário ativo
   - Calcula score com todos usuários num raio de 50km
   - Armazena em cache com validade de 24h

2. Quando usuário abre app:
   - Busca scores pré-calculados no cache
   - Ordena e apresenta feed
   - Rápido e eficiente

3. Cache expira:
   - Após 24h (perfis podem mudar)
   - Após usuário editar perfil (recalcula só os dele)
   - Após mudança significativa de localização (> 5km)

---

### 7.2 Priorização de Cálculo

**Fila de prioridades:**
1. Usuários próximos (< 5km) com radar ativo
2. Usuários com alta probabilidade de match (pré-filtro rápido)
3. Demais usuários da cidade
4. Usuários de outras cidades (baixa prioridade)

---

## 8. APRENDIZADO CONTÍNUO DA IA

### 8.1 Sinais de Feedback (Implícito)

Sistema coleta sinais para melhorar matching:

**Positivos:**
- Match confirmado
- Conversa iniciada no WhatsApp (inferido por tempo de match ativo)
- Usuário volta ao app após match (satisfação)

**Negativos:**
- Pass em perfil com score alto
- Match sem interação (ghost)
- Usuário desativa radar após tentativas

---

### 8.2 Ajuste de Pesos

Mensalmente, sistema analisa:
- Quais componentes do score tiveram maior correlação com matches reais
- Ajusta pesos dinamicamente

**Exemplo:**
- Se matches acontecem mais por proximidade que por complementaridade
  - Aumentar peso de Proximidade: 20% → 25%
  - Reduzir Complementaridade: 35% → 30%

---

### 8.3 Retreinamento de Embeddings

A cada 3 meses:
- Consolidar todos perfis + matches bem-sucedidos
- Retreinar modelo de embeddings (fine-tuning)
- Melhorar representação semântica específica do domínio

---

## 9. CASOS ESPECIAIS

### 9.1 Usuário sem Matches

**Se score com todos < 60:**

**Ação 1:** Sugestão de ampliar raio
```
"Não encontramos profissionais muito compatíveis por perto.
Quer ampliar para 20km?"
```

**Ação 2:** Sugestão de refinar perfil
```
"Vamos melhorar seu perfil para encontrar matches melhores?"
→ Re-fazer entrevista com foco em áreas com mais usuários
```

**Ação 3:** Modo exploração
```
"Enquanto buscamos matches perfeitos, que tal explorar
profissionais interessantes mesmo com compatibilidade média?"
→ Mostra perfis com score 50-60
```

---

### 9.2 Usuário Muito Popular (Muitos Likes)

**Se recebe > 50 likes/dia:**

**Problema:** Feed fica saturado

**Solução:**
- Mostrar apenas top 20 (score > 85)
- Criar fila: "Você tem mais 30 pessoas interessadas"
- Premium: acesso ilimitado ao feed

---

### 9.3 Usuário Inativo (Não usa há 7+ dias)

**Ação 1:** Notificação de reengajamento
```
"João, 3 novos profissionais compatíveis apareceram perto de você!"
```

**Ação 2:** E-mail semanal
```
"Resumo da semana: 12 novos matches potenciais esperando por você"
```

**Ação 3:** Pausar radar automaticamente
- Após 30 dias inativo, desativar radar (economizar bateria)
- Enviar notificação: "Seu radar foi pausado. Reativar?"

---

## 10. MÉTRICAS DE SUCESSO

### KPIs do Sistema de Matching

**Qualidade:**
- % de matches que viram conversa (target: > 60%)
- Score médio dos matches confirmados (target: > 75)
- Taxa de ghost após match (target: < 30%)

**Eficiência:**
- Tempo médio para primeiro match (target: < 24h)
- % usuários com pelo menos 1 match em 7 dias (target: > 70%)

**IA:**
- Correlação entre score e match real (target: > 0.7)
- Precisão de complementaridade (A busca X, B oferece X) (target: > 85%)

---

## 11. RESUMO EXECUTIVO

### O que a IA faz:

1. **Conduz entrevista adaptativa** (3-12 perguntas)
2. **Analisa respostas** e gera perfil semântico estruturado
3. **Cria representação vetorial** (embedding)
4. **Calcula compatibilidade** com outros usuários (score 0-100)
5. **Prioriza sugestões** por proximidade + score
6. **Envia notificações** inteligentes (radar ativo)
7. **Aprende continuamente** com feedbacks

### Score de Matching considera:

- **35%** Complementaridade (oferta × demanda)
- **25%** Similaridade semântica (embedding)
- **20%** Proximidade geográfica
- **10%** Alinhamento de momento de carreira
- **10%** Interesses comuns

### Resultado Final:

- Feed personalizado e ordenado
- Notificações contextuais ("alguém próximo!")
- Match revela WhatsApp direto
- Sistema melhora com uso

---

**FIM DO DOCUMENTO**
