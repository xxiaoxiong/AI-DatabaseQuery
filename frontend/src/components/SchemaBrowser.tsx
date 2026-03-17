import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronRight, ChevronDown, Table2, Columns, BarChart2, Info } from 'lucide-react'
import type { Schema } from '../api/datasources'
import TableProfileModal from './TableProfileModal'

interface Props {
  schema: Schema | null
  loading?: boolean
  dsId?: number
}

export default function SchemaBrowser({ schema, loading, dsId }: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [selectedTable, setSelectedTable] = useState<string | null>(null)
  const navigate = useNavigate()

  const toggle = (table: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(table)) next.delete(table)
      else next.add(table)
      return next
    })
  }

  const goProfile = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation()
    if (dsId) navigate(`/profile/${dsId}/${tableName}`)
  }

  const showTableInfo = (e: React.MouseEvent, tableName: string) => {
    e.stopPropagation()
    setSelectedTable(tableName)
  }

  if (loading) {
    return (
      <div className="p-4 text-sm text-slate-500 animate-pulse">
        加载 Schema 中...
      </div>
    )
  }

  if (!schema) {
    return (
      <div className="p-4 text-sm text-slate-400 text-center">
        请先选择数据源
      </div>
    )
  }

  const tables = Object.entries(schema)

  if (tables.length === 0) {
    return (
      <div className="p-4 text-sm text-slate-400 text-center">
        未找到表
      </div>
    )
  }

  return (
    <div className="text-sm">
      <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wide border-b border-slate-200">
        表结构 ({tables.length})
      </div>
      <div className="overflow-y-auto">
        {tables.map(([tableName, tableInfo]) => (
          <div key={tableName}>
            <button
              onClick={() => toggle(tableName)}
              className="w-full flex items-center gap-1.5 px-3 py-2 hover:bg-slate-100 text-left group"
            >
              {expanded.has(tableName) ? (
                <ChevronDown size={12} className="text-slate-400 shrink-0" />
              ) : (
                <ChevronRight size={12} className="text-slate-400 shrink-0" />
              )}
              <Table2 size={13} className="text-blue-500 shrink-0" />
              <span className="font-medium text-slate-700 truncate">{tableName}</span>
              {tableInfo.comment && (
                <span className="text-slate-400 text-xs truncate ml-1">
                  {tableInfo.comment}
                </span>
              )}
              <div className="ml-auto flex gap-0.5 opacity-0 group-hover:opacity-100 transition-all shrink-0">
                {dsId && (
                  <>
                    <button
                      onClick={(e) => showTableInfo(e, tableName)}
                      title="查看表详情"
                      className="p-0.5 rounded hover:bg-blue-100"
                    >
                      <Info size={12} className="text-blue-500" />
                    </button>
                    <button
                      onClick={(e) => goProfile(e, tableName)}
                      title="查看数据概览"
                      className="p-0.5 rounded hover:bg-blue-100"
                    >
                      <BarChart2 size={12} className="text-blue-500" />
                    </button>
                  </>
                )}
              </div>
            </button>
            {expanded.has(tableName) && (
              <div className="bg-slate-50 border-l-2 border-blue-200 ml-4">
                {tableInfo.columns.map(col => (
                  <div
                    key={col.name}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs"
                  >
                    <Columns size={11} className="text-slate-400 shrink-0" />
                    <span className="text-slate-700 font-mono">{col.name}</span>
                    <span className="text-slate-400">{col.type}</span>
                    {col.key === 'PRI' && (
                      <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded">PK</span>
                    )}
                    {col.comment && (
                      <span className="text-slate-400 truncate">{col.comment}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedTable && dsId && (
        <TableProfileModal
          dsId={dsId}
          tableName={selectedTable}
          onClose={() => setSelectedTable(null)}
        />
      )}
    </div>
  )
}
