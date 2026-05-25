# DarkMine — Search Improvements Spec

Objetivo: melhorar o motor de busca para identificar oportunidades de "vídeos com vídeos" no formato lista, priorizando velocidade de views nos últimos 30 dias em canais pequenos e jovens.

**Arquivos a modificar:**
- `lib/youtube.ts`
- `lib/scoring.ts`
- `app/api/darkmine/search/route.ts`

---

## 1. `lib/youtube.ts`

### Mudança: janela de busca de 180 → 30 dias

**Linha ~112** dentro da função `searchVideos`:

```ts
// ANTES
const publishedStr = publishedAfter?.toISOString() || new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString();

// DEPOIS
const publishedStr = publishedAfter?.toISOString() || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
```

---

## 2. `lib/scoring.ts`

### Mudança A: adicionar `computeListaScore`

Adicionar esta função nova após `computeFacelessScore`:

```ts
export function computeListaScore(title: string): number {
  let score = 0;

  // Número em qualquer posição do título
  const hasNumber = /\b\d+\b/.test(title);
  if (hasNumber) score += 40;

  // Padrões de lista
  const listPatterns = [
    /\btop\s*\d+/i,
    /\bbest\s+\d+/i,
    /\d+\s+(things|ways|reasons|places|facts|tips|mistakes|secrets|foods|cars|cities|countries|items|products|signs|movies|shows|games|animals|people|moments)/i,
    /\b(ranking|ranked|list of|compilation|every|all the)\b/i,
    /^#\d+/,
  ];

  for (const pattern of listPatterns) {
    if (pattern.test(title)) {
      score += 60;
      break;
    }
  }

  return Math.min(score, 100);
}
```

### Mudança B: atualizar interface `ScoringSignals`

```ts
// ANTES
interface ScoringSignals {
  facelessScore: number;
  commentGoldScore: number;
  timingBonus: number;
  monetizationSignals: number;
  outlierMultiplier: number;
}

// DEPOIS
interface ScoringSignals {
  facelessScore: number;
  commentGoldScore: number;
  timingBonus: number;
  monetizationSignals: number;
  outlierMultiplier: number;
  listaScore: number;
  viewsPerDay: number;
}
```

### Mudança C: re-pesar `computeFinalScore`

```ts
// ANTES
export function computeFinalScore(
  signals: ScoringSignals,
  searchType: 'money' | 'entertainment' | 'mixed' = 'mixed'
): { score: number; breakdown: ScoreBreakdown } {
  const weights = searchType === 'money'
    ? { faceless: 0.25, commentGold: 0.20, timing: 0.15, monetization: 0.15, outlier: 0.25 }
    : searchType === 'entertainment'
    ? { faceless: 0.30, commentGold: 0.15, timing: 0.15, monetization: 0.10, outlier: 0.30 }
    : { faceless: 0.25, commentGold: 0.20, timing: 0.15, monetization: 0.15, outlier: 0.25 };

  const outlierScore = Math.min(signals.outlierMultiplier * 20, 100);

  const facelessScaled = signals.facelessScore * weights.faceless;
  const commentScaled = signals.commentGoldScore * weights.commentGold;
  const timingScaled = signals.timingBonus * (100 / 25) * weights.timing;
  const monetizationScaled = signals.monetizationSignals * (100 / 30) * weights.monetization;
  const outlierScaled = outlierScore * weights.outlier;

  const finalScore = Math.round(
    facelessScaled + commentScaled + timingScaled + monetizationScaled + outlierScaled
  );

  const breakdown: ScoreBreakdown = {
    facelessScore: signals.facelessScore,
    commentGoldScore: signals.commentGoldScore,
    timingBonus: signals.timingBonus,
    monetizationSignals: signals.monetizationSignals,
    nicheScore: 0,
    finalScore,
  };

  return { score: Math.min(finalScore, 100), breakdown };
}

// DEPOIS
export function computeFinalScore(
  signals: ScoringSignals,
  searchType: 'money' | 'entertainment' | 'mixed' = 'mixed'
): { score: number; breakdown: ScoreBreakdown } {
  // Pesos unificados — priorizando velocidade de views e outlier
  const weights = {
    outlier: 0.25,
    viewsPerDay: 0.20,
    timing: 0.15,
    lista: 0.15,
    faceless: 0.10,
    commentGold: 0.10,
    monetization: 0.05,
  };

  const outlierScore = Math.min(signals.outlierMultiplier * 20, 100);

  // Views/dia normalizado: 500/dia = 50 pontos, 2000+/dia = 100 pontos
  const viewsPerDayScore = Math.min((signals.viewsPerDay / 2000) * 100, 100);

  const outlierScaled       = outlierScore                                      * weights.outlier;
  const viewsPerDayScaled   = viewsPerDayScore                                  * weights.viewsPerDay;
  const timingScaled        = signals.timingBonus * (100 / 25)                  * weights.timing;
  const listaScaled         = signals.listaScore                                * weights.lista;
  const facelessScaled      = signals.facelessScore                             * weights.faceless;
  const commentScaled       = signals.commentGoldScore                          * weights.commentGold;
  const monetizationScaled  = signals.monetizationSignals * (100 / 30)         * weights.monetization;

  const finalScore = Math.round(
    outlierScaled + viewsPerDayScaled + timingScaled + listaScaled +
    facelessScaled + commentScaled + monetizationScaled
  );

  const breakdown: ScoreBreakdown = {
    facelessScore: signals.facelessScore,
    commentGoldScore: signals.commentGoldScore,
    timingBonus: signals.timingBonus,
    monetizationSignals: signals.monetizationSignals,
    nicheScore: signals.listaScore,  // reutilizando campo nicheScore para listaScore no breakdown
    finalScore,
  };

  return { score: Math.min(finalScore, 100), breakdown };
}
```

---

## 3. `app/api/darkmine/search/route.ts`

### Mudança A: importar `computeListaScore`

```ts
// ANTES
import { computeFacelessScore, computeCommentGoldScore, classifyNiche, computeTimingBonus, computeMonetizationSignals, computeFinalScore, calculateOutlierMultiplier, calculateViewsPerDay, determineSearchType } from '@/lib/scoring';

// DEPOIS
import { computeFacelessScore, computeCommentGoldScore, computeListaScore, classifyNiche, computeTimingBonus, computeMonetizationSignals, computeFinalScore, calculateOutlierMultiplier, calculateViewsPerDay, determineSearchType } from '@/lib/scoring';
```

### Mudança B: 4 filtros no loop de vídeos

Localizar o bloco do loop `for (const video of videoDetails)` e aplicar as mudanças abaixo, na ordem:

```ts
// ANTES — filtro de subscribers
if (channel.subscriberCount > maxSubscribers) continue;

// DEPOIS — mantém filtro de subscribers + adiciona filtro de canal jovem
if (channel.subscriberCount > maxSubscribers) continue;
if (channel.totalVideos > 30) continue; // canal com mais de 30 vídeos não interessa

// ANTES — filtro de outlier
const outlierMultiplier = calculateOutlierMultiplier(video.views, channel.subscriberCount);
if (outlierMultiplier < 1) continue;

// DEPOIS — mantém igual

// ANTES — filtro de views/dia
const viewsPerDay = calculateViewsPerDay(video.views, video.publishedAt);
if (viewsPerDay < 200) continue;

// DEPOIS — sobe piso de 200 para 500
const viewsPerDay = calculateViewsPerDay(video.views, video.publishedAt);
if (viewsPerDay < 500) continue;

// NOVO — adicionar logo após o filtro de viewsPerDay
// Filtro de duração: apenas vídeos acima de 10 minutos (600 segundos)
if (video.durationSec > 0 && video.durationSec < 600) continue;
```

### Mudança C: calcular `listaScore` e passar para `computeFinalScore`

```ts
// ANTES — bloco de scores
const facelessScore = computeFacelessScore(channel, videoDetails);
const { nicheId, subnicheId, confidence } = classifyNiche(...)
const timingBonus = computeTimingBonus(channel);
const monetizationSignals = computeMonetizationSignals(channel.description);

// ...

const { score: finalScore, breakdown } = computeFinalScore(
  {
    facelessScore,
    commentGoldScore,
    timingBonus,
    monetizationSignals,
    outlierMultiplier,
  },
  type
);

// DEPOIS — adicionar listaScore e viewsPerDay
const facelessScore = computeFacelessScore(channel, videoDetails);
const listaScore = computeListaScore(video.title); // NOVO
const { nicheId, subnicheId, confidence } = classifyNiche(...)
const timingBonus = computeTimingBonus(channel);
const monetizationSignals = computeMonetizationSignals(channel.description);

// ...

const { score: finalScore, breakdown } = computeFinalScore(
  {
    facelessScore,
    commentGoldScore,
    timingBonus,
    monetizationSignals,
    outlierMultiplier,
    listaScore,    // NOVO
    viewsPerDay,   // NOVO
  },
  type
);
```

---

## Resumo das mudanças

| Arquivo | Mudança | Impacto |
|---|---|---|
| `lib/youtube.ts` | Janela 180d → 30d | Busca só o que é recente |
| `lib/scoring.ts` | Nova função `computeListaScore` | Detecta formato lista no título |
| `lib/scoring.ts` | Interface `ScoringSignals` + 2 campos | Suporte a lista e views/dia no score |
| `lib/scoring.ts` | Re-peso do `computeFinalScore` | Views/dia e outlier lideram o score |
| `app/api/darkmine/search/route.ts` | Import `computeListaScore` | Usa a nova função |
| `app/api/darkmine/search/route.ts` | Filtro canal: `totalVideos > 30` | Só canais jovens |
| `app/api/darkmine/search/route.ts` | Filtro views/dia: 200 → 500 | Elimina resultados fracos |
| `app/api/darkmine/search/route.ts` | Filtro duração: `< 600s` descarta | Só vídeos acima de 10 min |
| `app/api/darkmine/search/route.ts` | Passa `listaScore` e `viewsPerDay` | Score completo |

**Total: 9 mudanças cirúrgicas, zero chamadas novas de API.**

---

## Como testar após implementar

1. Rodar localmente com `npm run dev`
2. Acessar `/darkmine`
3. Buscar por um nicho amplo (ex: `cars`, `cities`, `food`)
4. Verificar se os resultados têm vídeos com mais de 10 min
5. Verificar se os canais têm menos de 30 vídeos
6. Verificar se o score reflete outlier e views/dia como fatores principais
