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
}
