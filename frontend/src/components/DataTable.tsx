import { useState } from 'react'
import { ChevronUp, ChevronDown } from 'lucide-react'

interface Props {
  columns: string[]
  rows: Record<string, unknown>[]
}

export default function DataTable({ columns, rows }: Props) {
  const [sortCol, setSortCol] = useState<string | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')
  const [page, setPage] = useState(0)
  const pageSize = 50

  const handleSort = (col: string) => {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('asc')
    }
    setPage(0)
  }

  const sorted = sortCol
    ? [...rows].sort((a, b) => {
        const av = a[sortCol]
        const bv = b[sortCol]
        if (av == null) return 1
        if (bv == null) return -1
        const cmp = av < bv ? -1 : av > bv ? 1 : 0
        return sortDir === 'asc' ? cmp : -cmp
      })
    : rows

  const totalPages = Math.ceil(sorted.length / pageSize)
  const paged = sorted.slice(page * pageSize, (page + 1) * pageSize)

  if (!columns.length) {
    return <div className="flex items-center justify-center h-full text-slate-400 text-sm">暂无数据</div>
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-auto">
        <table className="w-full text-sm border-collapse">
          <thead className="sticky top-0 bg-slate-100 z-10">
            <tr>
              {columns.map(col => (
                <th
                  key={col}
                  onClick={() => handleSort(col)}
                  className="px-3 py-2 text-left font-semibold text-slate-600 border-b border-slate-200 cursor-pointer hover:bg-slate-200 whitespace-nowrap select-none"
                >
                  <div className="flex items-center gap-1">
                    {col}
                    {sortCol === col ? (
                      sortDir === 'asc' ? <ChevronUp size={12} /> : <ChevronDown size={12} />
                    ) : (
                      <ChevronUp size={12} className="opacity-0 group-hover:opacity-30" />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paged.map((row, i) => (
              <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-slate-50'}>
                {columns.map(col => (
                  <td key={col} className="px-3 py-1.5 border-b border-slate-100 text-slate-700 max-w-xs truncate">
                    {row[col] == null ? (
                      <span className="text-slate-300 italic">NULL</span>
                    ) : (
                      String(row[col])
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-3 py-2 border-t border-slate-200 text-xs text-slate-500 bg-white shrink-0">
          <span>共 {rows.length} 行，第 {page + 1}/{totalPages} 页</span>
          <div className="flex gap-1">
            <button
              onClick={() => setPage(p => Math.max(0, p - 1))}
              disabled={page === 0}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              上一页
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="px-2 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-100"
            >
              下一页
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
