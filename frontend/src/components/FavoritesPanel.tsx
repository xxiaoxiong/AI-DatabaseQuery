import { useState, useEffect } from 'react'
import { Star, Trash2, Edit2, Loader2, Heart, Search, AlertTriangle } from 'lucide-react'
import { queryApi } from '../api/query'
import { toast } from './Toast'

interface Favorite {
  id: number
  datasource_id: number | null
  natural_language: string
  generated_sql: string | null
  tags: string | null
  description: string | null
  execute_count: number
  last_executed_at: string | null
  created_at: string | null
}

export default function FavoritesPanel() {
  const [favorites, setFavorites] = useState<Favorite[]>([])
  const [loading, setLoading] = useState(true)
  const [searchKeyword, setSearchKeyword] = useState('')
  const [selectedTags, setSelectedTags] = useState<string[]>([])
  const [allTags, setAllTags] = useState<string[]>([])
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editTags, setEditTags] = useState('')
  const [editDesc, setEditDesc] = useState('')

  const loadFavorites = async () => {
    setLoading(true)
    try {
      const data = await queryApi.searchFavorites(
        searchKeyword || undefined,
        selectedTags.length > 0 ? selectedTags.join(',') : undefined,
        undefined,
        100,
        0
      )
      setFavorites(data)
      
      // 提取所有标签
      const tags = new Set<string>()
      data.forEach((fav: Favorite) => {
        if (fav.tags) {
          fav.tags.split(',').forEach((tag: string) => tags.add(tag.trim()))
        }
      })
      setAllTags(Array.from(tags).sort())
    } catch (e) {
      console.error('加载收藏失败', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFavorites()
  }, [searchKeyword, selectedTags])

  const handleDelete = async (id: number) => {
    try {
      await queryApi.deleteFavorite(id)
      setFavorites(f => f.filter(item => item.id !== id))
      toast.success('已删除收藏')
    } catch (e) {
      console.error('删除失败', e)
      toast.error('删除失败')
    } finally {
      setConfirmDeleteId(null)
    }
  }

  const [editNL, setEditNL] = useState('')
  const [editSQL, setEditSQL] = useState('')
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null)

  const handleSaveEdit = async (id: number) => {
    try {
      await queryApi.updateFavorite(id, {
        tags: editTags || undefined,
        description: editDesc || undefined,
        natural_language: editNL || undefined,
        generated_sql: editSQL || undefined,
      })
      setFavorites(f => f.map(item =>
        item.id === id ? { 
          ...item, 
          tags: editTags, 
          description: editDesc,
          natural_language: editNL,
          generated_sql: editSQL
        } : item
      ))
      setEditingId(null)
    } catch (e) {
      console.error('更新失败', e)
    }
  }

  const toggleTag = (tag: string) => {
    setSelectedTags(prev =>
      prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
    )
  }

  const formatTime = (ts: string | null) => {
    if (!ts) return ''
    const d = new Date(ts)
    return d.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' })
  }

  return (
    <div className="flex flex-col h-full">
      {/* 搜索和过滤 */}
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0 space-y-3">
        <h1 className="text-lg font-semibold text-slate-800">我的收藏</h1>
        
        {/* 搜索框 */}
        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="搜索收藏..."
            value={searchKeyword}
            onChange={e => setSearchKeyword(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* 标签过滤 */}
        {allTags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {allTags.map(tag => (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`px-2.5 py-1 text-xs rounded-full transition-colors ${
                  selectedTags.includes(tag)
                    ? 'bg-blue-500 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 收藏列表 */}
      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : favorites.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Heart size={48} className="mb-4 opacity-30" />
            <p className="text-sm">暂无收藏</p>
          </div>
        ) : (
          <div className="space-y-3">
            {favorites.map(fav => (
              <div key={fav.id} className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-sm transition-shadow">
                {editingId === fav.id ? (
                  // 编辑模式
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">问题（中文）</label>
                      <textarea
                        value={editNL}
                        onChange={e => setEditNL(e.target.value)}
                        placeholder="输入查询问题..."
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">SQL 语句</label>
                      <textarea
                        value={editSQL}
                        onChange={e => setEditSQL(e.target.value)}
                        placeholder="输入 SQL 语句..."
                        rows={3}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded font-mono focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">标签</label>
                      <input
                        type="text"
                        value={editTags}
                        onChange={e => setEditTags(e.target.value)}
                        placeholder="用逗号分隔多个标签"
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-slate-500 block mb-1">备注</label>
                      <textarea
                        value={editDesc}
                        onChange={e => setEditDesc(e.target.value)}
                        placeholder="添加备注..."
                        rows={2}
                        className="w-full px-2 py-1.5 text-sm border border-slate-200 rounded focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => setEditingId(null)}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={() => handleSaveEdit(fav.id)}
                        className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        保存
                      </button>
                    </div>
                  </div>
                ) : (
                  // 显示模式
                  <>
                    <div className="flex items-start gap-3 mb-2">
                      <Star size={14} className="text-amber-400 fill-amber-400 mt-0.5 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-slate-800">{fav.natural_language}</div>
                        {fav.description && (
                          <div className="text-xs text-slate-500 mt-1">{fav.description}</div>
                        )}
                      </div>
                    </div>

                    {fav.tags && (
                      <div className="flex flex-wrap gap-1.5 mb-2">
                        {fav.tags.split(',').map(tag => (
                          <span key={tag} className="inline-block px-2 py-0.5 text-xs bg-slate-100 text-slate-600 rounded">
                            {tag.trim()}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-slate-400 mb-3">
                      <span>执行 {fav.execute_count} 次 · {formatTime(fav.last_executed_at)}</span>
                    </div>

                    {fav.generated_sql && (
                      <div className="mb-3 p-2 bg-slate-50 rounded border border-slate-100">
                        <pre className="text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap break-words">
                          {fav.generated_sql}
                        </pre>
                      </div>
                    )}

                    {confirmDeleteId === fav.id ? (
                      <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg">
                        <AlertTriangle size={13} className="text-red-500 shrink-0" />
                        <span className="text-xs text-red-700 flex-1">确定删除这个收藏？</span>
                        <button
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1 text-xs text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          取消
                        </button>
                        <button
                          onClick={() => handleDelete(fav.id)}
                          className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingId(fav.id)
                            setEditNL(fav.natural_language || '')
                            setEditSQL(fav.generated_sql || '')
                            setEditTags(fav.tags || '')
                            setEditDesc(fav.description || '')
                          }}
                          className="flex-1 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                        >
                          <Edit2 size={14} className="inline mr-1" />
                          编辑
                        </button>
                        <button
                          onClick={() => setConfirmDeleteId(fav.id)}
                          className="px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

