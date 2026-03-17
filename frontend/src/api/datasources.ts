import apiClient from './client'

export interface DataSource {
  id: number
  name: string
  db_type: string
  host?: string
  port?: number
  username?: string
  database_name: string
  description?: string
  is_active: boolean
  created_at?: string
}

export interface DataSourceCreate {
  name: string
  db_type: string
  host?: string
  port?: number
  username?: string
  password?: string
  database_name: string
  description?: string
}

export interface SchemaColumn {
  name: string
  type: string
  nullable: boolean
  comment: string
  key?: string
}

export interface SchemaTable {
  comment: string
  columns: SchemaColumn[]
}

export type Schema = Record<string, SchemaTable>

export interface ColumnStat {
  name: string
  type: string
  kind: 'numeric' | 'text' | 'time' | 'other'
  comment: string
  // numeric
  min?: number | null
  max?: number | null
  avg?: number | null
  sum?: number | null
  non_null_count?: number
  null_count?: number
  // text
  distinct_count?: number
  top_values?: { value: string; count: number }[]
}

export interface TableProfile {
  table_name: string
  total_rows: number
  columns: ColumnStat[]
  time_columns: string[]
}

export interface TrendPoint {
  date: string
  count: number
}

export interface TableTrend {
  time_col: string
  days: number
  data: TrendPoint[]
}

export interface AITableProfile {
  id: number
  datasource_id: number
  table_name: string
  table_description: string | null
  business_meaning: string | null
  field_descriptions: string | null  // JSON string
  related_tables: string | null  // JSON string
  user_notes: string | null
  created_at: string | null
  updated_at: string | null
}

export interface DictionaryTask {
  id: number
  datasource_id: number
  task_name: string
  status: string
  format: string
  include_examples: number
  include_relations: number
  file_path: string | null
  error_message: string | null
  created_at: string | null
  completed_at: string | null
}

export const datasourceApi = {
  list: () => apiClient.get<DataSource[]>('/api/datasources').then(r => r.data),
  get: (id: number) => apiClient.get<DataSource>(`/api/datasources/${id}`).then(r => r.data),
  create: (data: DataSourceCreate) => apiClient.post<DataSource>('/api/datasources', data).then(r => r.data),
  update: (id: number, data: Partial<DataSourceCreate>) =>
    apiClient.put<DataSource>(`/api/datasources/${id}`, data).then(r => r.data),
  delete: (id: number) => apiClient.delete(`/api/datasources/${id}`).then(r => r.data),
  test: (id: number) =>
    apiClient.post<{ success: boolean; message: string }>(`/api/datasources/${id}/test`).then(r => r.data),
  getSchema: (id: number) =>
    apiClient.get<{ schema: Schema }>(`/api/datasources/${id}/schema`).then(r => r.data),
  getTableProfile: (dsId: number, tableName: string) =>
    apiClient.get<TableProfile>(`/api/datasources/${dsId}/tables/${tableName}/profile`).then(r => r.data),
  getTableTrend: (dsId: number, tableName: string, timeCol: string, days: number) =>
    apiClient.get<TableTrend>(`/api/datasources/${dsId}/tables/${tableName}/trend`, {
      params: { time_col: timeCol, days },
    }).then(r => r.data),
  getAITableProfile: (dsId: number, tableName: string) =>
    apiClient.get<AITableProfile>(`/api/datasources/${dsId}/tables/${tableName}/ai-profile`).then(r => r.data),
  updateAITableProfile: (dsId: number, tableName: string, userNotes: string) =>
    apiClient.put<AITableProfile>(`/api/datasources/${dsId}/tables/${tableName}/ai-profile`, { user_notes: userNotes }).then(r => r.data),
  generateDictionary: (dsId: number, taskName: string, format: string, includeExamples: boolean, includeRelations: boolean) =>
    apiClient.post<DictionaryTask>(`/api/datasources/${dsId}/generate-dictionary`, {
      task_name: taskName,
      format,
      include_examples: includeExamples,
      include_relations: includeRelations,
    }).then(r => r.data),
  getDictionaryTask: (dsId: number, taskId: number) =>
    apiClient.get<DictionaryTask>(`/api/datasources/${dsId}/dictionary-task/${taskId}`).then(r => r.data),
  downloadDictionary: (dsId: number, taskId: number) =>
    apiClient.get(`/api/datasources/${dsId}/dictionary-download/${taskId}`, { responseType: 'blob' }).then(r => r.data),
}
