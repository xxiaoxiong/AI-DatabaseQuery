import { useState, useEffect } from 'react'
import { X, Loader2, Download, CheckCircle, AlertCircle } from 'lucide-react'
import { datasourceApi, DictionaryTask } from '../api/datasources'

interface Props {
  dsId: number
  dsName: string
  onClose: () => void
}

export default function GenerateDictionaryModal({ dsId, dsName, onClose }: Props) {
  const [step, setStep] = useState<'config' | 'generating' | 'completed'>('config')
  const [format, setFormat] = useState<'markdown' | 'html'>('markdown')
  const [includeExamples, setIncludeExamples] = useState(true)
  const [includeRelations, setIncludeRelations] = useState(true)
  const [taskName, setTaskName] = useState(`${dsName}_数据字典`)
  const [task, setTask] = useState<DictionaryTask | null>(null)
  const [generating, setGenerating] = useState(false)

  // 轮询任务状态
  useEffect(() => {
    if (!task || task.status === 'completed' || task.status === 'failed') return

    const timer = setInterval(async () => {
      try {
        const updated = await datasourceApi.getDictionaryTask(dsId, task.id)
        setTask(updated)
      } catch (e) {
        console.error('查询任务状态失败', e)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [task?.id, dsId])

  // 当任务状态变为完成或失败时，更新步骤
  useEffect(() => {
    if (task && (task.status === 'completed' || task.status === 'failed')) {
      setStep('completed')
    }
  }, [task?.status])

  const handleGenerate = async () => {
    setGenerating(true)
    try {
      const newTask = await datasourceApi.generateDictionary(
        dsId,
        taskName,
        format,
        includeExamples,
        includeRelations
      )
      setTask(newTask)
      setStep('generating')
    } catch (e) {
      console.error('生成失败', e)
      alert('生成失败: ' + (e instanceof Error ? e.message : '未知错误'))
    } finally {
      setGenerating(false)
    }
  }

  const handleDownload = async () => {
    if (!task) return
    try {
      const blob = await datasourceApi.downloadDictionary(dsId, task.id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${taskName}.${format}`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } catch (e) {
      console.error('下载失败', e)
      alert('下载失败')
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
        {/* 头部 */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200">
          <h2 className="text-lg font-semibold text-slate-800">生成数据字典</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={20} />
          </button>
        </div>

        {/* 内容 */}
        <div className="p-6">
          {step === 'config' && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1">
                  字典名称
                </label>
                <input
                  type="text"
                  value={taskName}
                  onChange={e => setTaskName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  导出格式
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="markdown"
                      checked={format === 'markdown'}
                      onChange={e => setFormat(e.target.value as 'markdown' | 'html')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">Markdown（易编辑）</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      value="html"
                      checked={format === 'html'}
                      onChange={e => setFormat(e.target.value as 'markdown' | 'html')}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-slate-700">HTML（可在线查看）</span>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeExamples}
                    onChange={e => setIncludeExamples(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">包含常用查询示例</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={includeRelations}
                    onChange={e => setIncludeRelations(e.target.checked)}
                    className="w-4 h-4"
                  />
                  <span className="text-sm text-slate-700">包含表关系信息</span>
                </label>
              </div>

              <div className="flex gap-2 pt-4">
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                >
                  {generating ? (
                    <>
                      <Loader2 size={14} className="animate-spin" />
                      生成中...
                    </>
                  ) : (
                    '开始生成'
                  )}
                </button>
              </div>
            </div>
          )}

          {step === 'generating' && task && (
            <div className="space-y-4">
              <div className="flex items-center justify-center">
                <Loader2 size={32} className="animate-spin text-blue-600" />
              </div>
              <div className="text-center">
                <p className="text-sm font-medium text-slate-700">正在生成数据字典...</p>
                <p className="text-xs text-slate-500 mt-1">
                  状态: {task.status === 'processing' ? '处理中' : task.status}
                </p>
              </div>
            </div>
          )}

          {step === 'completed' && task && (
            <div className="space-y-4">
              {task.status === 'completed' ? (
                <>
                  <div className="flex items-center justify-center">
                    <CheckCircle size={48} className="text-green-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">生成成功！</p>
                    <p className="text-xs text-slate-500 mt-1">
                      数据字典已准备好下载
                    </p>
                  </div>
                  <div className="flex gap-2 pt-4">
                    <button
                      onClick={onClose}
                      className="flex-1 px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                    >
                      关闭
                    </button>
                    <button
                      onClick={handleDownload}
                      className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center gap-2"
                    >
                      <Download size={14} />
                      下载
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center justify-center">
                    <AlertCircle size={48} className="text-red-500" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium text-slate-700">生成失败</p>
                    <p className="text-xs text-red-600 mt-1">
                      {task.error_message || '未知错误'}
                    </p>
                  </div>
                  <button
                    onClick={onClose}
                    className="w-full px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                  >
                    关闭
                  </button>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

