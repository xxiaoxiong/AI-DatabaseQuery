import { useState, useEffect } from 'react'
import { X, Loader2, Edit2, Save } from 'lucide-react'
import { datasourceApi, AITableProfile } from '../api/datasources'

interface Props {
  dsId: number
  tableName: string
  onClose: () => void
}

export default function TableProfileModal({ dsId, tableName, onClose }: Props) {
  const [profile, setProfile] = useState<AITableProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editing, setEditing] = useState(false)
  const [userNotes, setUserNotes] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [dsId, tableName])

  const loadProfile = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = await datasourceApi.getAITableProfile(dsId, tableName)
      setProfile(data)
      setUserNotes(data.user_notes || '')
    } catch (e: any) {
      console.error('加载表解读失败', e)
      const errorMsg = e?.response?.data?.detail || e?.message || '加载失败，请重试'
      setError(errorMsg)
      setProfile(null)
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const updated = await datasourceApi.updateAITableProfile(dsId, tableName, userNotes)
      setProfile(updated)
      setEditing(false)
    } catch (e) {
      console.error('保存失败', e)
      alert('保存失败')
    } finally {
      setSaving(false)
    }
  }

  const parseJSON = (str: string | null | undefined) => {
    if (!str) return {}
    try {
      return JSON.parse(str)
    } catch {
      return {}
    }
  }

  const fieldDescriptions = parseJSON(profile?.field_descriptions)
  const relatedTables = parseJSON(profile?.related_tables) || []

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 shrink-0">
          <div>
            <h2 className="text-lg font-semibold text-slate-800">{tableName}</h2>
            <p className="text-sm text-slate-500 mt-0.5">表结构智能解读</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="flex items-center justify-center h-32 text-slate-400">
              <Loader2 size={20} className="animate-spin mr-2" />
              加载中...
            </div>
          ) : error ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-red-600 bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex-1">
                  <p className="font-medium text-sm">加载失败</p>
                  <p className="text-sm mt-1">{error}</p>
                </div>
              </div>
              <button
                onClick={loadProfile}
                className="w-full px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                重试
              </button>
            </div>
          ) : profile ? (
            <>
              {/* 表描述 */}
              {profile.table_description && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">表描述</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg">
                    {profile.table_description}
                  </p>
                </div>
              )}

              {/* 业务含义 */}
              {profile.business_meaning && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">业务含义</h3>
                  <p className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg leading-relaxed">
                    {profile.business_meaning}
                  </p>
                </div>
              )}

              {/* 字段说明 */}
              {Object.keys(fieldDescriptions).length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">字段说明</h3>
                  <div className="space-y-2">
                    {Object.entries(fieldDescriptions).map(([field, desc]) => (
                      <div key={field} className="bg-slate-50 p-3 rounded-lg">
                        <div className="text-xs font-mono text-blue-600 mb-1">{field}</div>
                        <div className="text-sm text-slate-600">{String(desc)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* 相关表 */}
              {relatedTables.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 mb-2">相关表</h3>
                  <div className="flex flex-wrap gap-2">
                    {relatedTables.map((table: string) => (
                      <span key={table} className="inline-block px-3 py-1.5 bg-blue-100 text-blue-700 text-xs rounded-full">
                        {table}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* 用户备注 */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h3 className="text-sm font-semibold text-slate-700">用户备注</h3>
                  {!editing && (
                    <button
                      onClick={() => setEditing(true)}
                      className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
                    >
                      <Edit2 size={12} />
                      编辑
                    </button>
                  )}
                </div>
                {editing ? (
                  <div className="space-y-2">
                    <textarea
                      value={userNotes}
                      onChange={e => setUserNotes(e.target.value)}
                      placeholder="添加你的备注..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                    />
                    <div className="flex gap-2 justify-end">
                      <button
                        onClick={() => {
                          setEditing(false)
                          setUserNotes(profile.user_notes || '')
                        }}
                        className="px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-100 rounded transition-colors"
                      >
                        取消
                      </button>
                      <button
                        onClick={handleSave}
                        disabled={saving}
                        className="flex items-center gap-1 px-3 py-1.5 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
                      >
                        {saving ? (
                          <>
                            <Loader2 size={12} className="animate-spin" />
                            保存中...
                          </>
                        ) : (
                          <>
                            <Save size={12} />
                            保存
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-slate-600 bg-slate-50 p-3 rounded-lg min-h-[60px]">
                    {userNotes || <span className="text-slate-400 italic">暂无备注</span>}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="text-center text-slate-400 py-8">
              <p className="text-sm">暂无数据</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

