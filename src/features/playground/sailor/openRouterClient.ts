import type {
  SailorAiResponse,
  SailorModel,
  SailorProfile,
} from './sailorTypes'

interface OpenRouterModel {
  id?: string
  name?: string
  context_length?: number
  architecture?: {
    input_modalities?: string[]
    modality?: string
    output_modalities?: string[]
  }
  pricing?: {
    prompt?: string
    completion?: string
    request?: string
    image?: string
  }
}

interface AskOpenRouterRequest {
  apiKey: string
  question: string
  profile: SailorProfile
  lastQuery: string
  modelId: string
}

const openRouterBaseUrl = 'https://openrouter.ai/api/v1'

export async function listOpenRouterModels(
  apiKey: string,
): Promise<SailorModel[]> {
  const response = await fetch(`${openRouterBaseUrl}/models`, {
    headers: getOpenRouterHeaders(apiKey),
  })

  if (!response.ok) {
    throw new Error(await readProviderError(response))
  }

  const payload = await response.json()
  const models = Array.isArray(payload?.data)
    ? (payload.data as OpenRouterModel[])
    : []

  return models
    .filter(isFreeOpenRouterModel)
    .map(toSailorModel)
    .sort((left, right) => {
      const ownerSort = left.owner.localeCompare(right.owner)

      return ownerSort === 0 ? left.label.localeCompare(right.label) : ownerSort
    })
}

export async function askOpenRouter(
  request: AskOpenRouterRequest,
): Promise<SailorAiResponse> {
  const response = await fetch(`${openRouterBaseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      ...getOpenRouterHeaders(request.apiKey),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: request.modelId,
      messages: [
        {
          role: 'system',
          content: [
            'You are a data analyst inside a browser SQL explorer.',
            'Return strict JSON only with keys: answer, suggestedQueries, derivedFeatures.',
            'suggestedQueries is an array of {title, sql, reason}.',
            'derivedFeatures is an array of {name, sqlExpression, why}.',
            `Use DuckDB SQL and table name ${request.profile.tableName}.`,
            'Do not invent columns. Do not add markdown.',
          ].join('\n'),
        },
        {
          role: 'user',
          content: JSON.stringify({
            question: request.question,
            profile: request.profile,
            lastQuery: request.lastQuery,
          }),
        },
      ],
      temperature: 0.2,
    }),
  })

  if (!response.ok) {
    throw new Error(await readProviderError(response))
  }

  const data = await response.json()
  const content = data?.choices?.[0]?.message?.content

  if (typeof content !== 'string') {
    throw new Error('OpenRouter returned empty response')
  }

  return parseAiResponse(content)
}

function getOpenRouterHeaders(apiKey: string) {
  return {
    Authorization: `Bearer ${apiKey}`,
    'HTTP-Referer': window.location.origin,
    'X-Title': 'Sailor',
  }
}

function parseAiResponse(rawText: string): SailorAiResponse {
  let parsed: unknown

  try {
    parsed = JSON.parse(stripJsonFences(rawText))
  } catch {
    throw new Error('OpenRouter did not return valid JSON')
  }

  if (!parsed || typeof parsed !== 'object') {
    throw new Error('OpenRouter did not return a JSON object')
  }

  const value = parsed as Record<string, unknown>

  return {
    answer: typeof value.answer === 'string' ? value.answer : '',
    suggestedQueries: Array.isArray(value.suggestedQueries)
      ? value.suggestedQueries.filter(isSuggestedQuery)
      : [],
    derivedFeatures: Array.isArray(value.derivedFeatures)
      ? value.derivedFeatures.filter(isDerivedFeature)
      : [],
  }
}

async function readProviderError(response: Response) {
  const text = await response.text().catch(() => 'OpenRouter request failed')

  try {
    const payload = JSON.parse(text)
    const message = payload?.error?.message
    const raw = payload?.error?.metadata?.raw

    if (typeof raw === 'string' && raw.length > 0) {
      return raw
    }

    if (typeof message === 'string' && message.length > 0) {
      return message
    }
  } catch {
    // Fall through to the raw response text.
  }

  return text
}

function stripJsonFences(text: string) {
  let cleaned = text.trim()

  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.slice(7)
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.slice(3)
  }

  if (cleaned.endsWith('```')) {
    cleaned = cleaned.slice(0, -3)
  }

  return cleaned.trim()
}

function isSuggestedQuery(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    'title' in value &&
    typeof value.title === 'string' &&
    'sql' in value &&
    typeof value.sql === 'string' &&
    'reason' in value &&
    typeof value.reason === 'string'
  )
}

function isDerivedFeature(value: unknown) {
  return (
    !!value &&
    typeof value === 'object' &&
    'name' in value &&
    typeof value.name === 'string' &&
    'sqlExpression' in value &&
    typeof value.sqlExpression === 'string' &&
    'why' in value &&
    typeof value.why === 'string'
  )
}

function priceIsZero(value: string | undefined) {
  return Number(value ?? '0') === 0
}

function supportsTextChat(model: OpenRouterModel) {
  const architecture = model.architecture
  const inputModalities = architecture?.input_modalities ?? []
  const outputModalities = architecture?.output_modalities ?? []

  return (
    architecture?.modality === 'text->text' &&
    inputModalities.length === 1 &&
    inputModalities[0] === 'text' &&
    outputModalities.length === 1 &&
    outputModalities[0] === 'text'
  )
}

function isFreeOpenRouterModel(model: OpenRouterModel) {
  const pricing = model.pricing ?? {}

  return (
    typeof model.id === 'string' &&
    model.id.length > 0 &&
    priceIsZero(pricing.prompt) &&
    priceIsZero(pricing.completion) &&
    priceIsZero(pricing.request) &&
    priceIsZero(pricing.image) &&
    supportsTextChat(model)
  )
}

function toSailorModel(model: OpenRouterModel): SailorModel {
  const display = getModelDisplayParts(model)

  return {
    id: model.id ?? '',
    owner: display.owner,
    label: display.label,
    name: display.name,
    contextLength:
      typeof model.context_length === 'number' ? model.context_length : null,
    promptPrice: model.pricing?.prompt ?? '0',
    completionPrice: model.pricing?.completion ?? '0',
  }
}

function getModelDisplayParts(model: OpenRouterModel) {
  const id = model.id ?? ''
  const ownerSlug = id.split('/')[0] ?? ''
  const fallbackOwner = formatOwner(ownerSlug)
  const name = model.name?.trim() || id
  const prefixedNameMatch = name.match(/^([^:]+):\s*(.+)$/)

  if (prefixedNameMatch) {
    return {
      owner: prefixedNameMatch[1],
      label: prefixedNameMatch[2],
      name,
    }
  }

  return {
    owner: fallbackOwner,
    label: name,
    name,
  }
}

function formatOwner(ownerSlug: string) {
  return ownerSlug
    .split('-')
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')
}
