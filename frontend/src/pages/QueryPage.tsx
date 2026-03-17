import { useState, useEffect, useRef, useCallback } from 'react'
import { Send, Code2, BarChart2, Table, ChevronDown, ChevronUp, Loader2, RefreshCw, Sparkles, AlertCircle, X, Download, Star } from 'lucide-react'
import { useAppStore } from '../store/useAppStore'
import { datasourceApi } from '../api/datasources'
import { queryApi } from '../api/query'
import SchemaBrowser from '../components/SchemaBrowser'
import DataTable from '../components/DataTable'
import ChartPanel from '../components/ChartPanel'
import { toast } from '../components/Toast'

// 拖拽分隔线组件
function ResizeDivider({ onMouseDown }: { onMouseDown: (e: React.MouseEvent) => void }) {
  return (
    <div
      onMouseDown={onMouseDown}
      className="w-1 cursor-col-resize bg-slate-200 hover:bg-blue-400 active:bg-blue-500 transition-colors shrink-0 relative group"
      style={{ touchAction: 'none' }}
    >
      <div className="absolute inset-y-0 -left-1 -right-1" />
    </div>
  )
}

export default function QueryPage() {
  const {
    datasources, activeDatasourceId, activeSchema, schemaLoading,
    currentQuestion, currentSQL, nl2sqlResult, queryResult,
    queryLoading, nl2sqlLoading, conversationHistory,
    setDatasources, setActiveDatasourceId, setActiveSchema, setSchemaLoading,
    setCurrentQuestion, setCurrentSQL, setNl2sqlResult, setQueryResult,
    setQueryLoading, setNl2sqlLoading, addToHistory, clearConversation,
  } = useAppStore()

  const [showSQL, setShowSQL] = useState(false)
  const [resultTab, setResultTab] = useState<'chart' | 'table'>('chart')
  const [sqlEditing, setSqlEditing] = useState(false)
  const [editedSQL, setEditedSQL] = useState('')
  const [aiPanelOpen, setAiPanelOpen] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [showExportMenu, setShowExportMenu] = useState(false)
  const [showFavorites, setShowFavorites] = useState(false)
  const [favorites, setFavorites] = useState<any[]>([])
  const [favoritesLoading, setFavoritesLoading] = useState(false)
  const [selectedFavorite, setSelectedFavorite] = useState<any>(null)
  const [editingFavSQL, setEditingFavSQL] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 左侧面板宽度（表结构）
  const [schemaWidth, setSchemaWidth] = useState(224) // 默认 w-56 = 224px
  const schemaResizing = useRef(false)
  const schemaResizeStartX = useRef(0)
  const schemaResizeStartWidth = useRef(0)

  // 右侧面板宽度（AI分析）
  const [aiPanelWidth, setAiPanelWidth] = useState(288) // 默认 w-72 = 288px
  const aiResizing = useRef(false)
  const aiResizeStartX = useRef(0)
  const aiResizeStartWidth = useRef(0)

  const handleSchemaResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    schemaResizing.current = true
    schemaResizeStartX.current = e.clientX
    schemaResizeStartWidth.current = schemaWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!schemaResizing.current) return
      const delta = ev.clientX - schemaResizeStartX.current
      const newWidth = Math.min(480, Math.max(160, schemaResizeStartWidth.current + delta))
      setSchemaWidth(newWidth)
    }
    const onMouseUp = () => {
      schemaResizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [schemaWidth])

  const handleAiResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    aiResizing.current = true
    aiResizeStartX.current = e.clientX
    aiResizeStartWidth.current = aiPanelWidth

    const onMouseMove = (ev: MouseEvent) => {
      if (!aiResizing.current) return
      const delta = aiResizeStartX.current - ev.clientX
      const newWidth = Math.min(600, Math.max(160, aiResizeStartWidth.current + delta))
      setAiPanelWidth(newWidth)
    }
    const onMouseUp = () => {
      aiResizing.current = false
      window.removeEventListener('mousemove', onMouseMove)
      window.removeEventListener('mouseup', onMouseUp)
    }
    window.addEventListener('mousemove', onMouseMove)
    window.addEventListener('mouseup', onMouseUp)
  }, [aiPanelWidth])

  useEffect(() => {
    datasourceApi.list().then(ds => {
      setDatasources(ds)
      if (ds.length > 0 && !activeDatasourceId) {
        setActiveDatasourceId(ds[0].id)
      }
    }).catch(() => {})
  }, [])

  useEffect(() => {
    if (!activeDatasourceId) return
    setSchemaLoading(true)
    datasourceApi.getSchema(activeDatasourceId)
      .then(r => setActiveSchema(r.schema))
      .catch(() => setActiveSchema(null))
      .finally(() => setSchemaLoading(false))
  }, [activeDatasourceId])

  // 加载收藏列表
  const loadFavorites = useCallback(async () => {
    if (!activeDatasourceId) return
    setFavoritesLoading(true)
    try {
      const data = await queryApi.getFavoritesList(activeDatasourceId, 10)
      setFavorites(data)
    } catch (e) {
      console.error('加载收藏失败', e)
    } finally {
      setFavoritesLoading(false)
    }
  }, [activeDatasourceId])

  // 快速执行收藏
  const handleExecuteFavorite = useCallback(async (_favoriteId: number, customSQL?: string) => {
    setError(null)
    setQueryLoading(true)
    try {
      const sql = customSQL || selectedFavorite?.generated_sql
      if (!sql) {
        setError('没有 SQL 语句')
        setQueryLoading(false)
        return
      }

      const result = await queryApi.execute({
        datasource_id: activeDatasourceId!,
        sql,
        natural_language: selectedFavorite?.natural_language,
        save_history: true,
      })
      setQueryResult(result)
      if (!result.success) {
        setError(result.error || '查询执行失败')
      } else {
        setResultTab(result.chart_type && result.chart_type !== 'table' ? 'chart' : 'table')
        setShowFavorites(false)
        setSelectedFavorite(null)
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '执行失败')
    } finally {
      setQueryLoading(false)
    }
  }, [selectedFavorite, activeDatasourceId])

  const handleSubmit = useCallback(async () => {
    if (!currentQuestion.trim() || !activeDatasourceId) return
    setError(null)
    setNl2sqlLoading(true)
    setShowSQL(false)
    setQueryResult(null)

    try {
      const nl2sql = await queryApi.nl2sql({
        datasource_id: activeDatasourceId,
        question: currentQuestion,
        conversation_history: conversationHistory,
      })
      setNl2sqlResult(nl2sql)

      if (nl2sql.clarification) {
        setNl2sqlLoading(false)
        return
      }

      if (!nl2sql.sql) {
        setError('AI 未能生成 SQL，请尝试更具体的描述')
        setNl2sqlLoading(false)
        return
      }

      setCurrentSQL(nl2sql.sql)
      setShowSQL(true)
      setNl2sqlLoading(false)
      setQueryLoading(true)

      const result = await queryApi.execute({
        datasource_id: activeDatasourceId,
        sql: nl2sql.sql,
        natural_language: currentQuestion,
        chart_type: nl2sql.chart_suggestion,
        save_history: true,
      })
      setQueryResult(result)
      if (!result.success) {
        setError(result.error || '查询执行失败')
      } else {
        addToHistory({ nl: currentQuestion, sql: nl2sql.sql })
        setResultTab(result.chart_type && result.chart_type !== 'table' ? 'chart' : 'table')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '请求失败')
    } finally {
      setNl2sqlLoading(false)
      setQueryLoading(false)
    }
  }, [currentQuestion, activeDatasourceId, conversationHistory])

  const handleRunSQL = useCallback(async () => {
    if (!activeDatasourceId) return
    const sql = sqlEditing ? editedSQL : currentSQL
    if (!sql.trim()) return
    setError(null)
    setQueryLoading(true)

    try {
      const result = await queryApi.execute({
        datasource_id: activeDatasourceId,
        sql,
        natural_language: currentQuestion,
        save_history: true,
      })
      setQueryResult(result)
      if (!result.success) {
        setError(result.error || '查询执行失败')
      } else {
        setResultTab(result.chart_type && result.chart_type !== 'table' ? 'chart' : 'table')
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '执行失败')
    } finally {
      setQueryLoading(false)
    }
  }, [activeDatasourceId, currentSQL, editedSQL, sqlEditing, currentQuestion])

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault()
      handleSubmit()
    }
  }

  const handleExport = useCallback(async (format: 'excel' | 'csv') => {
    if (!queryResult?.history_id) return
    setExportLoading(true)
    try {
      const blob = await queryApi.export(queryResult.history_id, format)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `查询结果_${new Date().getTime()}.${format === 'excel' ? 'xlsx' : 'csv'}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      setShowExportMenu(false)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : '导出失败')
    } finally {
      setExportLoading(false)
    }
  }, [queryResult?.history_id])

  const isLoading = nl2sqlLoading || queryLoading

  return (
    <div className="flex h-full overflow-hidden">
      {/* Left: Schema Browser */}
      <div className="border-r border-slate-200 bg-white flex flex-col shrink-0" style={{ width: schemaWidth }}>
        <div className="p-2 border-b border-slate-200">
          <select
            className="w-full text-sm border border-slate-200 rounded px-2 py-1.5 bg-white focus:outline-none focus:ring-1 focus:ring-blue-500"
            value={activeDatasourceId ?? ''}
            onChange={e => {
              const id = Number(e.target.value)
              setActiveDatasourceId(id || null)
              clearConversation()
            }}
          >
            <option value="">选择数据源</option>
            {datasources.map(ds => (
              <option key={ds.id} value={ds.id}>{ds.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 overflow-y-auto">
          <SchemaBrowser schema={activeSchema} loading={schemaLoading} dsId={activeDatasourceId ?? undefined} />
        </div>
      </div>
      <ResizeDivider onMouseDown={handleSchemaResizeStart} />

      {/* Center: Query + Results */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Query Input */}
        <div className="bg-white border-b border-slate-200 p-4 shrink-0">
          <div className="relative">
            <textarea
              ref={textareaRef}
              value={currentQuestion}
              onChange={e => setCurrentQuestion(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="用自然语言描述你的查询需求，例如：上个月各城市销售额从高到低..."
              rows={3}
              className="w-full resize-none border border-slate-200 rounded-lg px-4 py-3 pr-24 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-slate-400"
              disabled={isLoading}
            />
            <div className="absolute right-3 bottom-3 flex items-center gap-2">
              <span className="text-xs text-slate-400">Ctrl+Enter</span>
              <button
                onClick={() => { setShowFavorites(!showFavorites); if (!showFavorites) loadFavorites() }}
                className="flex items-center gap-1.5 px-2 py-1.5 bg-amber-100 text-amber-700 rounded-md text-xs font-medium hover:bg-amber-200 transition-colors"
                title="快速选择收藏查询"
              >
                <Star size={12} />
              </button>
              <button
                onClick={handleSubmit}
                disabled={isLoading || !currentQuestion.trim() || !activeDatasourceId}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {nl2sqlLoading ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                发送
              </button>
            </div>
          </div>

          {/* 收藏快速选择 */}
          {showFavorites && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-semibold text-amber-900">我的收藏</h3>
                <button onClick={() => { setShowFavorites(false); setSelectedFavorite(null) }} className="text-amber-400 hover:text-amber-600">
                  <X size={14} />
                </button>
              </div>
              
              {!selectedFavorite ? (
                // 收藏列表
                favoritesLoading ? (
                  <div className="flex items-center gap-2 text-sm text-amber-700">
                    <Loader2 size={14} className="animate-spin" />
                    加载中...
                  </div>
                ) : favorites.length === 0 ? (
                  <p className="text-sm text-amber-600">暂无收藏</p>
                ) : (
                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {favorites.map(fav => (
                      <button
                        key={fav.id}
                        onClick={() => { setSelectedFavorite(fav); setEditingFavSQL(fav.generated_sql || '') }}
                        className="w-full text-left px-2 py-1.5 text-sm text-amber-900 hover:bg-amber-100 rounded transition-colors truncate"
                        title={fav.natural_language}
                      >
                        {fav.natural_language}
                      </button>
                    ))}
                  </div>
                )
              ) : (
                // 选中的收藏详情
                <div className="space-y-2">
                  <div>
                    <div className="text-xs font-semibold text-amber-900 mb-1">问题</div>
                    <div className="text-sm text-amber-800 bg-white p-2 rounded">{selectedFavorite.natural_language}</div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-amber-900 mb-1">SQL 语句</div>
                    <textarea
                      value={editingFavSQL}
                      onChange={e => setEditingFavSQL(e.target.value)}
                      className="w-full px-2 py-1.5 text-xs font-mono border border-amber-200 rounded focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                      rows={3}
                    />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setSelectedFavorite(null)}
                      className="flex-1 px-2 py-1.5 text-xs text-amber-700 hover:bg-amber-100 rounded transition-colors"
                    >
                      返回
                    </button>
                    <button
                      onClick={() => handleExecuteFavorite(selectedFavorite.id, editingFavSQL)}
                      disabled={queryLoading}
                      className="flex-1 px-2 py-1.5 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                    >
                      {queryLoading ? '执行中...' : '执行'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SQL Preview */}
          {currentSQL && (
            <div className="mt-3 border border-slate-200 rounded-lg overflow-hidden">
              <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-b border-slate-200">
                <div className="flex items-center gap-2 text-xs text-slate-600">
                  <Code2 size={13} />
                  <span className="font-medium">生成的 SQL</span>
                  {nl2sqlResult && (
                    <span className="text-slate-400">
                      置信度 {Math.round((nl2sqlResult.confidence || 0) * 100)}%
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {sqlEditing ? (
                    <>
                      <button
                        onClick={() => { setSqlEditing(false); setEditedSQL('') }}
                        className="text-xs text-slate-500 hover:text-slate-700"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleRunSQL}
                        disabled={queryLoading}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                      >
                        {queryLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        执行
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={() => { setSqlEditing(true); setEditedSQL(currentSQL) }}
                        className="text-xs text-blue-600 hover:text-blue-800"
                      >
                        编辑
                      </button>
                      <button
                        onClick={handleRunSQL}
                        disabled={queryLoading}
                        className="flex items-center gap-1 text-xs px-2 py-1 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
                      >
                        {queryLoading ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                        重新执行
                      </button>
                    </>
                  )}
                  <button onClick={() => setShowSQL(v => !v)} className="text-slate-400 hover:text-slate-600">
                    {showSQL ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  </button>
                </div>
              </div>
              {showSQL && (
                sqlEditing ? (
                  <textarea
                    value={editedSQL}
                    onChange={e => setEditedSQL(e.target.value)}
                    className="w-full p-3 font-mono text-xs bg-slate-900 text-green-400 focus:outline-none resize-none"
                    rows={6}
                  />
                ) : (
                  <pre className="p-3 font-mono text-xs bg-slate-900 text-green-400 overflow-x-auto whitespace-pre-wrap">
                    {currentSQL}
                  </pre>
                )
              )}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
              <AlertCircle size={15} className="shrink-0 mt-0.5" />
              <span className="flex-1">{error}</span>
              <button onClick={() => setError(null)}><X size={14} /></button>
            </div>
          )}

          {/* Clarification */}
          {nl2sqlResult?.clarification && (
            <div className="mt-3 flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Sparkles size={15} className="shrink-0 mt-0.5" />
              <span>{nl2sqlResult.clarification}</span>
            </div>
          )}

          {/* Loading state */}
          {isLoading && (
            <div className="mt-3 flex items-center gap-2 text-sm text-slate-500">
              <Loader2 size={14} className="animate-spin" />
              {nl2sqlLoading ? 'AI 正在理解您的问题...' : '正在执行查询...'}
            </div>
          )}
        </div>

        {/* Results */}
        {queryResult && (
          <div className="flex-1 flex overflow-hidden">
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Result tabs */}
              <div className="flex items-center gap-1 px-4 py-2 border-b border-slate-200 bg-white shrink-0">
                <button
                  onClick={() => setResultTab('chart')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    resultTab === 'chart' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <BarChart2 size={14} />
                  图表
                </button>
                <button
                  onClick={() => setResultTab('table')}
                  className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md transition-colors ${
                    resultTab === 'table' ? 'bg-blue-100 text-blue-700 font-medium' : 'text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Table size={14} />
                  表格
                </button>
                <div className="ml-auto flex items-center gap-2">
                  <div className="text-xs text-slate-400">
                    {queryResult.row_count} 行 · {queryResult.execution_time_ms}ms
                  </div>
                  <button
                    onClick={async () => {
                      try {
                        await queryApi.createFavorite({
                          datasource_id: activeDatasourceId!,
                          natural_language: currentQuestion,
                          generated_sql: currentSQL,
                        })
                        toast.success('已添加到收藏')
                      } catch (e) {
                        toast.error('添加收藏失败')
                      }
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors"
                    title="添加到收藏"
                  >
                    <Star size={14} />
                    收藏
                  </button>
                  <div className="relative">
                    <button
                      onClick={() => setShowExportMenu(!showExportMenu)}
                      disabled={exportLoading}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md bg-slate-100 text-slate-700 hover:bg-slate-200 disabled:opacity-50 transition-colors"
                    >
                      {exportLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                      导出
                    </button>
                    {showExportMenu && (
                      <div className="absolute right-0 mt-1 bg-white border border-slate-200 rounded-md shadow-lg z-10">
                        <button
                          onClick={() => handleExport('excel')}
                          disabled={exportLoading}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
                        >
                          导出为 Excel
                        </button>
                        <button
                          onClick={() => handleExport('csv')}
                          disabled={exportLoading}
                          className="block w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50 border-t border-slate-100"
                        >
                          导出为 CSV
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-hidden p-4">
                {resultTab === 'chart' ? (
                  <ChartPanel
                    chartType={queryResult.chart_type || 'table'}
                    columns={queryResult.columns}
                    rows={queryResult.rows}
                  />
                ) : (
                  <DataTable columns={queryResult.columns} rows={queryResult.rows} />
                )}
              </div>
            </div>
          </div>
        )}

        {!queryResult && !isLoading && (
          <div className="flex-1 flex items-center justify-center text-slate-400">
            <div className="text-center">
              <Sparkles size={40} className="mx-auto mb-3 opacity-30" />
              <p className="text-sm">输入问题，AI 将自动生成 SQL 并展示结果</p>
              <p className="text-xs mt-1 text-slate-300">支持中英文 · Ctrl+Enter 快速提交</p>
            </div>
          </div>
        )}
      </div>

      {/* Right: AI Analysis Panel */}
      {queryResult?.ai_summary && (
        <>
        <ResizeDivider onMouseDown={handleAiResizeStart} />
        <div className="border-l border-slate-200 bg-white flex flex-col shrink-0" style={{ width: aiPanelOpen ? aiPanelWidth : 40 }}>
          <div className="flex items-center justify-between p-3 border-b border-slate-200">
            {aiPanelOpen && (
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles size={14} className="text-purple-500" />
                AI 分析
              </div>
            )}
            <button
              onClick={() => setAiPanelOpen(v => !v)}
              className="text-slate-400 hover:text-slate-600 ml-auto"
            >
              {aiPanelOpen ? <ChevronDown size={14} /> : <Sparkles size={14} />}
            </button>
          </div>
          {aiPanelOpen && (
            <div className="flex-1 overflow-y-auto p-3">
              <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                {queryResult.ai_summary}
              </p>
              {nl2sqlResult?.explanation && (
                <div className="mt-4 pt-3 border-t border-slate-100">
                  <div className="text-xs font-semibold text-slate-500 mb-1">查询说明</div>
                  <p className="text-xs text-slate-500 leading-relaxed">{nl2sqlResult.explanation}</p>
                </div>
              )}
            </div>
          )}
        </div>
        </>
      )}
    </div>
  )
}
