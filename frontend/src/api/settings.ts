import apiClient from './client'

export interface SettingsResponse {
  llm_base_url: string
  llm_model: string
  llm_api_key_set: boolean
}

export interface SettingsUpdate {
  llm_base_url?: string
  llm_api_key?: string
  llm_model?: string
}

export const settingsApi = {
  get: () => apiClient.get<SettingsResponse>('/api/settings').then(r => r.data),
  update: (data: SettingsUpdate) => apiClient.put('/api/settings', data).then(r => r.data),
}
