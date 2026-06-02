import type {
  SailorAiProviderId,
  SailorAiResponse,
  SailorModel,
  SailorProfile,
} from './sailorTypes'

interface SailorAiRequest {
  question: string
  profile: SailorProfile
  lastQuery: string
  modelId: string
  provider: SailorAiProviderId
}

export async function listSailorModels(
  provider: SailorAiProviderId,
): Promise<SailorModel[]> {
  if (provider === 'webllm') {
    const { listWebLlmModels } = await import('./webLlmClient')

    return listWebLlmModels()
  }

  const { getOpenRouterApiKey } = await import('./openRouterAuth')
  const { listOpenRouterModels } = await import('./openRouterClient')

  return listOpenRouterModels(requireOpenRouterApiKey(getOpenRouterApiKey()))
}

export async function askSailorAi(
  request: SailorAiRequest,
  onProgress?: (progress: { progress: number; text: string }) => void,
): Promise<SailorAiResponse> {
  if (request.provider === 'webllm') {
    const { askWebLlm } = await import('./webLlmClient')

    return askWebLlm(request, onProgress)
  }

  const { getOpenRouterApiKey } = await import('./openRouterAuth')
  const { askOpenRouter } = await import('./openRouterClient')

  return askOpenRouter({
    apiKey: requireOpenRouterApiKey(getOpenRouterApiKey()),
    question: request.question,
    profile: request.profile,
    lastQuery: request.lastQuery,
    modelId: request.modelId,
  })
}

function requireOpenRouterApiKey(apiKey: string) {
  if (!apiKey) {
    throw new Error('OpenRouter is not connected')
  }

  return apiKey
}
