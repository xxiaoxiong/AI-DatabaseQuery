import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, RefreshCw, Hash, Type, Clock, BarChart2,
  TrendingUp, AlertCircle, Loader2, Calendar
} from 'lucide-react'
import ReactECharts from 'echarts-for-react'
import { datasourceApi, type TableProfile, type ColumnStat, type TrendPoint } from '../api/datasources'
import { useAppStore } from '../store/useAppStore'

function fmt(val: number | null | undefined): string {
  if (val === null || val === undefined) return '—'
  if (Math.abs(val) >= 1e8) return (val / 1e8).toFixed(2) + '亿'
  if (Math.abs(val) >= 1e4) return (val / 1e4).toFixed(2) + '万'
  return val.toLocaleString('zh-CN', { maximumFractionDigits: 4 })
}

function NullBadge({ nullCount, total }: { nullCount?: number; total: number }) {
  if (!nullCount) return <span className="text-xs text-green-600 bg-green-50 px-1.5 py-0.5 rounded">无空值</span>
  const pct = total > 0 ? ((nullCount / total) * 100).toFixed(1) : '0'
  return (
    <span className="text-xs text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded">
      空值 {pct}%
    </span>
  )
}

function NumericCard({ col, total }: { col: ColumnStat; total: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Hash size={14} className="text-blue-500 shrink-0" />
          <span className="font-mono font-medium text-slate-800 truncate">{col.name}</span>
          <span className="text-xs text-slate-400 shrink-0">{col.type}</span>
        </div>
        <NullBadge nullCount={col.null_count} total={total} />
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">最小值</div>
          <div className="font-semibold text-slate-700">{fmt(col.min)}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2 text-center">
          <div className="text-xs text-slate-500 mb-0.5">最大值</div>
          <div className="font-semibold text-slate-700">{fmt(col.max)}</div>
        </div>
        <div className="bg-blue-50 rounded-lg p-2 text-center">
          <div className="text-xs text-blue-500 mb-0.5">平均值</div>
          <div className="font-semibold text-blue-700">{fmt(col.avg)}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-2 text-center">
          <div className="text-xs text-purple-500 mb-0.5">总和</div>
          <div className="font-semibold text-purple-700">{fmt(col.sum)}</div>
        </div>
      </div>
    </div>
  )
}

function TextCard({ col, total }: { col: ColumnStat; total: number }) {
  const topValues = col.top_values || []
  const maxCount = topValues[0]?.count || 1
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Type size={14} className="text-emerald-500 shrink-0" />
          <span className="font-mono font-medium text-slate-800 truncate">{col.name}</span>
          <span className="text-xs text-slate-400 shrink-0">{col.type}</span>
        </div>
        <NullBadge nullCount={col.null_count} total={total} />
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className="text-slate-500">唯一值</span>
        <span className="font-semibold text-slate-800">{col.distinct_count?.toLocaleString() ?? '—'}</span>
        <span className="text-slate-400 text-xs">/ {total.toLocaleString()} 行</span>
      </div>
      {topValues.length > 0 && (
        <div className="space-y-1.5">
          <div className="text-xs text-slate-500 font-medium">TOP 5 频次</div>
          {topValues.map((tv, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span className="text-slate-600 truncate w-24 shrink-0">{tv.value}</span>
              <div className="flex-1 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className="h-full bg-emerald-400 rounded-full"
                  style={{ width: `${(tv.count / maxCount) * 100}%` }}
                />
              </div>
              <span className="text-slate-500 shrink-0">{tv.count.toLocaleString()}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function TimeCard({ col, total }: { col: ColumnStat; total: number }) {
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Clock size={14} className="text-orange-500 shrink-0" />
          <span className="font-mono font-medium text-slate-800 truncate">{col.name}</span>
          <span className="text-xs text-slate-400 shrink-0">{col.type}</span>
        </div>
        <NullBadge nullCount={col.null_count} total={total} />
      </div>
      <div className="grid grid-cols-1 gap-2 text-sm">
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-0.5">最早</div>
          <div className="font-mono text-slate-700 text-xs">{col.min ?? '—'}</div>
        </div>
        <div className="bg-slate-50 rounded-lg p-2">
          <div className="text-xs text-slate-500 mb-0.5">最新</div>
          <div className="font-mono text-slate-700 text-xs">{col.max ?? '—'}</div>
        </div>
      </div>
    </div>
  )
}

function TrendChart({ data, timeCol, days }: { data: TrendPoint[]; timeCol: string; days: number }) {
  const option = {
    tooltip: { trigger: 'axis', axisPointer: { type: 'cross' } },
    grid: { left: 40, right: 20, top: 20, bottom: 40 },
    xAxis: {
      type: 'category',
      data: data.map(d => d.date),
      axisLabel: { fontSize: 11, rotate: data.length > 20 ? 30 : 0 },
    },
    yAxis: { type: 'value', axisLabel: { fontSize: 11 } },
    series: [{
      name: '记录数',
      type: 'line',
      data: data.map(d => d.count),
      smooth: true,
      areaStyle: { opacity: 0.15 },
      lineStyle: { width: 2 },
      itemStyle: { color: '#3b82f6' },
    }],
  }
  return (
    <div className="bg-white border border-slate-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <TrendingUp size={15} className="text-blue-500" />
        <span className="font-medium text-slate-700 text-sm">
          {timeCol} — 最近 {days} 天记录趋势
        </span>
      </div>
      {data.length === 0 ? (
        <div className="h-40 flex items-center justify-center text-slate-400 text-sm">
          该时间范围内无数据
        </div>
      ) : (
        <ReactECharts option={option} style={{ height: 200 }} />
      )}
    </div>
  )
}

export default function TableProfilePage() {
  const { dsId, tableName } = useParams<{ dsId: string; tableName: string }>()
  const navigate = useNavigate()
  const { datasources } = useAppStore()

  const [profile, setProfile] = useState<TableProfile | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [selectedTimeCol, setSelectedTimeCol] = useState<string>('')
  const [trendDays, setTrendDays] = useState<7 | 30>(30)
  const [trendData, setTrendData] = useState<TrendPoint[]>([])
  const [trendLoading, setTrendLoading] = useState(false)

  const dsIdNum = Number(dsId)
  const ds = datasources.find(d => d.id === dsIdNum)

  const loadProfile = useCallback(async () => {
    if (!dsId || !tableName) return
    setLoading(true)
    setError(null)
    try {
      const data = await datasourceApi.getTableProfile(dsIdNum, tableName)
      setProfile(data)
      if (data.time_columns.length > 0) {
        setSelectedTimeCol(data.time_columns[0])
      }
    } catch (e: any) {
      setError(e?.response?.data?.detail || '加载失败')
    } finally {
      setLoading(false)
    }
  }, [dsId, tableName])

  const loadTrend = useCallback(async () => {
    if (!dsId || !tableName || !selectedTimeCol) return
    setTrendLoading(true)
    try {
      const data = await datasourceApi.getTableTrend(dsIdNum, tableName, selectedTimeCol, trendDays)
      setTrendData(data.data)
    } catch {
      setTrendData([])
    } finally {
      setTrendLoading(false)
    }
  }, [dsId, tableName, selectedTimeCol, trendDays])

  useEffect(() => { loadProfile() }, [loadProfile])
  useEffect(() => {
    if (selectedTimeCol) loadTrend()
  }, [loadTrend, selectedTimeCol, trendDays])

  const numericCols = profile?.columns.filter(c => c.kind === 'numeric') ?? []
  const textCols = profile?.columns.filter(c => c.kind === 'text') ?? []
  const timeCols = profile?.columns.filter(c => c.kind === 'time') ?? []

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-6 py-4 flex items-center gap-4 shrink-0">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1.5 text-slate-500 hover:text-slate-800 text-sm transition-colors"
        >
          <ArrowLeft size={16} />
          返回
        </button>
        <div className="h-4 w-px bg-slate-200" />
        <div className="flex items-center gap-2">
          <BarChart2 size={18} className="text-blue-500" />
          <span className="font-semibold text-slate-800">{tableName}</span>
          {ds && <span className="text-xs text-slate-400">· {ds.name}</span>}
        </div>
        {profile && (
          <span className="ml-2 text-sm text-slate-500">
            共 <span className="font-semibold text-slate-700">{profile.total_rows.toLocaleString()}</span> 行 ·{' '}
            <span className="font-semibold text-slate-700">{profile.columns.length}</span> 列
          </span>
        )}
        <div className="ml-auto">
          <button
            onClick={loadProfile}
            disabled={loading}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors"
          >
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />
            刷新
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {loading && (
          <div className="flex items-center justify-center h-48 text-slate-400">
            <Loader2 size={24} className="animate-spin mr-2" />
            正在分析表结构和数据...
          </div>
        )}

        {error && (
          <div className="flex items-center gap-2 text-red-600 bg-red-50 border border-red-200 rounded-xl p-4">
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        {!loading && profile && (
          <>
            {/* 趋势图区域 */}
            {profile.time_columns.length > 0 && (
              <section>
                <div className="flex items-center gap-3 mb-3">
                  <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5">
                    <Calendar size={14} className="text-orange-500" />
                    时间趋势
                  </h2>
                  <select
                    value={selectedTimeCol}
                    onChange={e => setSelectedTimeCol(e.target.value)}
                    className="text-xs border border-slate-200 rounded-lg px-2 py-1 text-slate-600 bg-white"
                  >
                    {profile.time_columns.map(tc => (
                      <option key={tc} value={tc}>{tc}</option>
                    ))}
                  </select>
                  <div className="flex rounded-lg border border-slate-200 overflow-hidden text-xs">
                    {([7, 30] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setTrendDays(d)}
                        className={`px-3 py-1 transition-colors ${
                          trendDays === d ? 'bg-blue-500 text-white' : 'text-slate-600 hover:bg-slate-50'
                        }`}
                      >
                        近{d}天
                      </button>
                    ))}
                  </div>
                  {trendLoading && <Loader2 size={13} className="animate-spin text-slate-400" />}
                </div>
                <TrendChart data={trendData} timeCol={selectedTimeCol} days={trendDays} />
              </section>
            )}

            {/* 数值列 */}
            {numericCols.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
                  <Hash size={14} className="text-blue-500" />
                  数值列 ({numericCols.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {numericCols.map(col => (
                    <NumericCard key={col.name} col={col} total={profile.total_rows} />
                  ))}
                </div>
              </section>
            )}

            {/* 文本列 */}
            {textCols.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
                  <Type size={14} className="text-emerald-500" />
                  文本列 ({textCols.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {textCols.map(col => (
                    <TextCard key={col.name} col={col} total={profile.total_rows} />
                  ))}
                </div>
              </section>
            )}

            {/* 时间列 */}
            {timeCols.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-slate-700 flex items-center gap-1.5 mb-3">
                  <Clock size={14} className="text-orange-500" />
                  时间列 ({timeCols.length})
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                  {timeCols.map(col => (
                    <TimeCard key={col.name} col={col} total={profile.total_rows} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  )
}
