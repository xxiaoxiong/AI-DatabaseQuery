import { useState, useEffect } from 'react'
import { Plus, Pencil, Trash2, TestTube2, CheckCircle, XCircle, Loader2, Database, BookOpen } from 'lucide-react'
import { datasourceApi, DataSource, DataSourceCreate } from '../api/datasources'
import GenerateDictionaryModal from '../components/GenerateDictionaryModal'

const DB_TYPES = [
  { value: 'mysql', label: 'MySQL', defaultPort: 3306 },
  { value: 'postgresql', label: 'PostgreSQL', defaultPort: 5432 },
  { value: 'sqlite', label: 'SQLite', defaultPort: null },
]

const emptyForm: DataSourceCreate & { id?: number } = {
  name: '',
  db_type: 'mysql',
  host: 'localhost',
  port: 3306,
  username: '',
  password: '',
  database_name: '',
  description: '',
}

export default function DataSourcesPage() {
  const [datasources, setDatasources] = useState<DataSource[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [testResults, setTestResults] = useState<Record<number, { success: boolean; message: string } | 'testing'>>({})
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null)
  const [showDictionaryModal, setShowDictionaryModal] = useState<{ dsId: number; dsName: string } | null>(null)

  const load = () => {
    setLoading(true)
    datasourceApi.list()
      .then(setDatasources)
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const openCreate = () => {
    setForm(emptyForm)
    setShowModal(true)
  }

  const openEdit = (ds: DataSource) => {
    setForm({
      id: ds.id,
      name: ds.name,
      db_type: ds.db_type,
      host: ds.host || '',
      port: ds.port || undefined,
      username: ds.username || '',
      password: '',
      database_name: ds.database_name,
      description: ds.description || '',
    })
    setShowModal(true)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      if (form.id) {
        await datasourceApi.update(form.id, form)
      } else {
        await datasourceApi.create(form)
      }
      setShowModal(false)
      load()
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const handleTest = async (id: number) => {
    setTestResults(r => ({ ...r, [id]: 'testing' }))
    const result = await datasourceApi.test(id)
    setTestResults(r => ({ ...r, [id]: result }))
  }

  const handleDelete = async (id: number) => {
    await datasourceApi.delete(id)
    setDeleteConfirm(null)
    load()
  }

  const handleDbTypeChange = (dbType: string) => {
    const found = DB_TYPES.find(d => d.value === dbType)
    setForm(f => ({ ...f, db_type: dbType, port: found?.defaultPort || undefined }))
  }

  const isSQLite = form.db_type === 'sqlite'

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-white flex items-center justify-between shrink-0">
        <div>
          <h1 className="text-lg font-semibold text-slate-800">数据源管理</h1>
          <p className="text-sm text-slate-500 mt-0.5">管理数据库连接配置</p>
        </div>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus size={15} />
          添加数据源
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {loading ? (
          <div className="flex items-center justify-center h-32 text-slate-400">
            <Loader2 size={20} className="animate-spin mr-2" />
            加载中...
          </div>
        ) : datasources.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-64 text-slate-400">
            <Database size={48} className="mb-4 opacity-30" />
            <p className="text-sm">暂无数据源，点击右上角添加</p>
          </div>
        ) : (
          <div className="grid gap-4 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
            {datasources.map(ds => {
              const testResult = testResults[ds.id]
              return (
                <div key={ds.id} className="bg-white rounded-xl border border-slate-200 p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                        <Database size={15} className="text-blue-600" />
                      </div>
                      <div>
                        <div className="font-medium text-slate-800 text-sm">{ds.name}</div>
                        <div className="text-xs text-slate-400 uppercase">{ds.db_type}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(ds)} className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded">
                        <Pencil size={13} />
                      </button>
                      <button onClick={() => setDeleteConfirm(ds.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1 text-xs text-slate-500 mb-3">
                    {ds.host && <div>主机：{ds.host}:{ds.port}</div>}
                    <div>数据库：{ds.database_name}</div>
                    {ds.username && <div>用户：{ds.username}</div>}
                    {ds.description && <div className="text-slate-400">{ds.description}</div>}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleTest(ds.id)}
                      disabled={testResult === 'testing'}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 disabled:opacity-50 transition-colors"
                    >
                      {testResult === 'testing' ? (
                        <Loader2 size={11} className="animate-spin" />
                      ) : (
                        <TestTube2 size={11} />
                      )}
                      测试连接
                    </button>
                    <button
                      onClick={() => setShowDictionaryModal({ dsId: ds.id, dsName: ds.name })}
                      className="flex items-center gap-1.5 px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-slate-50 transition-colors"
                    >
                      <BookOpen size={11} />
                      生成字典
                    </button>
                    {testResult && testResult !== 'testing' && (
                      <div className={`flex items-center gap-1 text-xs ${testResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {testResult.success ? <CheckCircle size={12} /> : <XCircle size={12} />}
                        {testResult.message}
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b border-slate-200">
              <h2 className="text-base font-semibold text-slate-800">
                {form.id ? '编辑数据源' : '添加数据源'}
              </h2>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">名称 *</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.name}
                  onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                  placeholder="生产数据库"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">数据库类型 *</label>
                <select
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.db_type}
                  onChange={e => handleDbTypeChange(e.target.value)}
                >
                  {DB_TYPES.map(t => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              {!isSQLite && (
                <>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <label className="block text-xs font-medium text-slate-600 mb-1">主机</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.host || ''}
                        onChange={e => setForm(f => ({ ...f, host: e.target.value }))}
                        placeholder="localhost"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">端口</label>
                      <input
                        type="number"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.port || ''}
                        onChange={e => setForm(f => ({ ...f, port: Number(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">用户名</label>
                      <input
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.username || ''}
                        onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">密码</label>
                      <input
                        type="password"
                        className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                        value={form.password || ''}
                        onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                        placeholder={form.id ? '留空保持不变' : ''}
                      />
                    </div>
                  </div>
                </>
              )}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {isSQLite ? '文件路径 *' : '数据库名 *'}
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.database_name}
                  onChange={e => setForm(f => ({ ...f, database_name: e.target.value }))}
                  placeholder={isSQLite ? '/path/to/db.sqlite' : 'mydb'}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">备注</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={form.description || ''}
                  onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-slate-200 flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                disabled={saving || !form.name || !form.database_name}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving && <Loader2 size={13} className="animate-spin" />}
                保存
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl p-6 max-w-sm w-full">
            <h3 className="font-semibold text-slate-800 mb-2">确认删除</h3>
            <p className="text-sm text-slate-500 mb-4">删除后无法恢复，确定要删除这个数据源吗？</p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg">取消</button>
              <button onClick={() => handleDelete(deleteConfirm)} className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700">删除</button>
            </div>
          </div>
        </div>
      )}

      {/* Dictionary Modal */}
      {showDictionaryModal && (
        <GenerateDictionaryModal
          dsId={showDictionaryModal.dsId}
          dsName={showDictionaryModal.dsName}
          onClose={() => setShowDictionaryModal(null)}
        />
      )}
    </div>
  )
}
