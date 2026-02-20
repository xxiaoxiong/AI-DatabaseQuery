import apiClient from './client'

export interface NL2SQLRequest {
  datasource_id: number
  question: string
  conversation_history?: Array<{ nl: string; sql?: string }>
}

export interface NL2SQLResponse {
  sql: string | null
  explanation: string
  clarification: string | null
  chart_suggestion: string
  confidence: number
}

export interface ExecuteQueryRequest {
  datasource_id: number
  sql: string
  natural_language?: string
  chart_type?: string
  save_history?: boolean
}

export interface ExecuteQueryResponse {
  success: boolean
  error: string | null
  columns: string[]
  rows: Record<string, unknown>[]
  row_count: number
  execution_time_ms: number
  ai_summary: string | null
  chart_type: string | null
  history_id: number | null
}

export interface QueryHistory {
  id: number
  datasource_id: number | null
  natural_language: string
  generated_sql: string | null
  executed_sql: string | null
  row_count: number | null
  execution_time_ms: number | null
  status: string
  error_message: string | null
  ai_summary: string | null
  chart_type: string | null
  is_favorite: number
  created_at: string | null
}

export const queryApi = {
  nl2sql: (data: NL2SQLRequest) =>
    apiClient.post<NL2SQLResponse>('/api/query/nl2sql', data).then(r => r.data),
  execute: (data: ExecuteQueryRequest) =>
    apiClient.post<ExecuteQueryResponse>('/api/query/execute', data).then(r => r.data),
  getHistory: (limit = 50, offset = 0) =>
    apiClient.get<QueryHistory[]>('/api/query/history', { params: { limit, offset } }).then(r => r.data),
  toggleFavorite: (id: number) =>
    apiClient.put<{ is_favorite: number }>(`/api/query/history/${id}/favorite`).then(r => r.data),
}
