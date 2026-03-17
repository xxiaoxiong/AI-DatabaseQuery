import { useState, useEffect } from 'react'
import { Star, StarOff, Clock, CheckCircle, XCircle, Loader2, History, Heart } from 'lucide-react'
import { queryApi, QueryHistory } from '../api/query'
import FavoritesPanel from '../components/FavoritesPanel'
import { toast } from '../components/Toast'

export default function HistoryPage() {
  const [history, setHistory] = useState<QueryHistory[]>([])
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [tab, setTab] = useState<'history' | 'favorites'>('history')
  const [addingFavorite, setAddingFavorite] = useState<number | null>(null)

  const load = () => {
    setLoading(true)
    queryApi.getHistory(100)
      .then(setHistory)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toggleFavorite = async (id: number) => {
    await queryApi.toggleFavorite(id)
    setHistory(h => h.map(item =>
      item.id === id ? { ...item, is_favorite: item.is_favorite ? 0 : 1 } : item
    ))
  }

  const addToFavorites = async (item: QueryHistory) => {
    setAddingFavorite(item.id)
    try {
      await queryApi.createFavorite({
        datasource_id: item.datasource_id || 0,
        natural_language: item.natural_language,
        generated_sql: item.generated_sql || undefined,
      })
      toast.success('已添加到收藏')
    } catch (e) {
      console.error('添加收藏失败', e)
      toast.error('添加收藏失败')
    } finally {
      setAddingFavorite(null)
    }
  }

  const toggleExpand = (id: number) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const formatTime = (ts: string | null) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-slate-800">查询历史</h1>
        <div className="flex gap-4 mt-3">
          <button
            onClick={() => setTab('history')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'history'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <History size={14} />
            历史记录
          </button>
          <button
            onClick={() => setTab('favorites')}
            className={`flex items-center gap-2 px-3 py-1.5 text-sm rounded-md transition-colors ${
              tab === 'favorites'
                ? 'bg-blue-100 text-blue-700 font-medium'
                : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <Heart size={14} />
            我的收藏
          </button>
        </div>
      </div>

      {tab === 'history' ? (
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              加载中...
            </div>
          ) : history.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400">
              <History size={48} className="mb-4 opacity-30" />
              <p className="text-sm">暂无查询历史</p>
            </div>
          ) : (
            <div className="space-y-2">
              {history.map(item => (
                <div key={item.id} className="bg-white rounded-lg border border-slate-200 overflow-hidden hover:shadow-sm transition-shadow">
                  <div
                    className="flex items-start gap-3 p-4 cursor-pointer"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="mt-0.5">
                      {item.status === 'success' ? (
                        <CheckCircle size={15} className="text-green-500" />
                      ) : (
                        <XCircle size={15} className="text-red-500" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-slate-800 truncate">{item.natural_language}</div>
                      {item.generated_sql && (
                        <div className="text-xs text-slate-400 font-mono truncate mt-0.5">{item.generated_sql}</div>
                      )}
                      <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                          <Clock size={10} />
                          {formatTime(item.created_at)}
                        </span>
                        {item.row_count != null && <span>{item.row_count} 行</span>}
                        {item.execution_time_ms != null && <span>{item.execution_time_ms}ms</span>}
                        {item.chart_type && (
                          <span className="bg-slate-100 px-1.5 py-0.5 rounded text-slate-500">{item.chart_type}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <button
                        onClick={e => { e.stopPropagation(); addToFavorites(item) }}
                        disabled={addingFavorite === item.id}
                        className="p-1 text-slate-300 hover:text-red-400 transition-colors disabled:opacity-50"
                      >
                        {addingFavorite === item.id ? (
                          <Loader2 size={15} className="animate-spin" />
                        ) : (
                          <Heart size={15} />
                        )}
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); toggleFavorite(item.id) }}
                        className="p-1 text-slate-300 hover:text-amber-400 transition-colors"
                      >
                        {item.is_favorite ? (
                          <Star size={15} className="text-amber-400 fill-amber-400" />
                        ) : (
                          <StarOff size={15} />
                        )}
                      </button>
                    </div>
                  </div>

                  {expanded.has(item.id) && (
                    <div className="border-t border-slate-100 bg-slate-50 p-4 space-y-3">
                      {item.generated_sql && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">SQL</div>
                          <pre className="text-xs font-mono bg-slate-900 text-green-400 p-3 rounded-lg overflow-x-auto whitespace-pre-wrap">
                            {item.generated_sql}
                          </pre>
                        </div>
                      )}
                      {item.ai_summary && (
                        <div>
                          <div className="text-xs font-semibold text-slate-500 mb-1">AI 分析</div>
                          <p className="text-sm text-slate-600 leading-relaxed">{item.ai_summary}</p>
                        </div>
                      )}
                      {item.error_message && (
                        <div>
                          <div className="text-xs font-semibold text-red-500 mb-1">错误信息</div>
                          <p className="text-sm text-red-600">{item.error_message}</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        <FavoritesPanel />
      )}
    </div>
  )
}
