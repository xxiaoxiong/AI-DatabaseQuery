import { create } from 'zustand'
import type { DataSource, Schema } from '../api/datasources'
import type { ExecuteQueryResponse, NL2SQLResponse } from '../api/query'

interface ConversationItem {
  nl: string
  sql?: string
}

interface AppState {
  // Datasource
  datasources: DataSource[]
  activeDatasourceId: number | null
  activeSchema: Schema | null
  schemaLoading: boolean

  // Query
  currentQuestion: string
  currentSQL: string
  nl2sqlResult: NL2SQLResponse | null
  queryResult: ExecuteQueryResponse | null
  queryLoading: boolean
  nl2sqlLoading: boolean
  conversationHistory: ConversationItem[]

  // Actions
  setDatasources: (ds: DataSource[]) => void
  setActiveDatasourceId: (id: number | null) => void
  setActiveSchema: (schema: Schema | null) => void
  setSchemaLoading: (loading: boolean) => void
  setCurrentQuestion: (q: string) => void
  setCurrentSQL: (sql: string) => void
  setNl2sqlResult: (r: NL2SQLResponse | null) => void
  setQueryResult: (r: ExecuteQueryResponse | null) => void
  setQueryLoading: (loading: boolean) => void
  setNl2sqlLoading: (loading: boolean) => void
  addToHistory: (item: ConversationItem) => void
  clearConversation: () => void
}

export const useAppStore = create<AppState>((set) => ({
  datasources: [],
  activeDatasourceId: null,
  activeSchema: null,
  schemaLoading: false,
  currentQuestion: '',
  currentSQL: '',
  nl2sqlResult: null,
  queryResult: null,
  queryLoading: false,
  nl2sqlLoading: false,
  conversationHistory: [],

  setDatasources: (ds) => set({ datasources: ds }),
  setActiveDatasourceId: (id) => set({ activeDatasourceId: id }),
  setActiveSchema: (schema) => set({ activeSchema: schema }),
  setSchemaLoading: (loading) => set({ schemaLoading: loading }),
  setCurrentQuestion: (q) => set({ currentQuestion: q }),
  setCurrentSQL: (sql) => set({ currentSQL: sql }),
  setNl2sqlResult: (r) => set({ nl2sqlResult: r }),
  setQueryResult: (r) => set({ queryResult: r }),
  setQueryLoading: (loading) => set({ queryLoading: loading }),
  setNl2sqlLoading: (loading) => set({ nl2sqlLoading: loading }),
  addToHistory: (item) =>
    set((state) => ({
      conversationHistory: [...state.conversationHistory, item],
    })),
  clearConversation: () =>
    set({ conversationHistory: [], nl2sqlResult: null, queryResult: null, currentQuestion: '', currentSQL: '' }),
}))
