import { useState, useEffect } from 'react'
import { Save, Loader2, CheckCircle, Eye, EyeOff } from 'lucide-react'
import { settingsApi, SettingsResponse } from '../api/settings'

const PRESET_MODELS = [
  { label: 'DeepSeek Chat', value: 'deepseek-chat', url: 'https://api.deepseek.com' },
  { label: 'DeepSeek Reasoner', value: 'deepseek-reasoner', url: 'https://api.deepseek.com' },
  { label: 'GPT-4o', value: 'gpt-4o', url: 'https://api.openai.com/v1' },
  { label: '内网自部署模型', value: 'custom', url: '' },
]

export default function SettingsPage() {
  const [settings, setSettings] = useState<SettingsResponse | null>(null)
  const [form, setForm] = useState({ llm_base_url: '', llm_api_key: '', llm_model: '' })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [showKey, setShowKey] = useState(false)

  useEffect(() => {
    settingsApi.get().then(s => {
      setSettings(s)
      setForm({ llm_base_url: s.llm_base_url, llm_api_key: '', llm_model: s.llm_model })
    })
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload: Record<string, string> = {
        llm_base_url: form.llm_base_url,
        llm_model: form.llm_model,
      }
      if (form.llm_api_key) payload.llm_api_key = form.llm_api_key
      await settingsApi.update(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
      const updated = await settingsApi.get()
      setSettings(updated)
    } catch (e: unknown) {
      alert(e instanceof Error ? e.message : '保存失败')
    } finally {
      setSaving(false)
    }
  }

  const applyPreset = (preset: typeof PRESET_MODELS[0]) => {
    if (preset.url) {
      setForm(f => ({ ...f, llm_base_url: preset.url, llm_model: preset.value }))
    } else {
      setForm(f => ({ ...f, llm_model: preset.value }))
    }
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-6 py-4 border-b border-slate-200 bg-white shrink-0">
        <h1 className="text-lg font-semibold text-slate-800">系统设置</h1>
        <p className="text-sm text-slate-500 mt-0.5">配置 LLM 接入参数</p>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-xl space-y-6">
          {/* LLM Config */}
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <h2 className="text-sm font-semibold text-slate-700 mb-4">大模型配置</h2>

            {/* Presets */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-600 mb-2">快速选择</label>
              <div className="flex flex-wrap gap-2">
                {PRESET_MODELS.map(preset => (
                  <button
                    key={preset.value}
                    onClick={() => applyPreset(preset)}
                    className="px-3 py-1.5 text-xs border border-slate-200 rounded-md hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  API Base URL
                </label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={form.llm_base_url}
                  onChange={e => setForm(f => ({ ...f, llm_base_url: e.target.value }))}
                  placeholder="https://api.deepseek.com"
                />
                <p className="text-xs text-slate-400 mt-1">
                  兼容 OpenAI 协议的接口地址，切换内网模型只需修改此处
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  API Key
                  {settings?.llm_api_key_set && (
                    <span className="ml-2 text-green-600 font-normal">（已配置）</span>
                  )}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? 'text' : 'password'}
                    className="w-full border border-slate-200 rounded-lg px-3 py-2 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                    value={form.llm_api_key}
                    onChange={e => setForm(f => ({ ...f, llm_api_key: e.target.value }))}
                    placeholder={settings?.llm_api_key_set ? '留空保持不变' : '输入 API Key'}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey(v => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">模型名称</label>
                <input
                  className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono"
                  value={form.llm_model}
                  onChange={e => setForm(f => ({ ...f, llm_model: e.target.value }))}
                  placeholder="deepseek-chat"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
                保存设置
              </button>
              {saved && (
                <div className="flex items-center gap-1.5 text-sm text-green-600">
                  <CheckCircle size={14} />
                  已保存
                </div>
              )}
            </div>
          </div>

          {/* Info */}
          <div className="bg-blue-50 rounded-xl border border-blue-100 p-4 text-sm text-blue-700">
            <p className="font-medium mb-1">关于内网部署</p>
            <p className="text-xs text-blue-600 leading-relaxed">
              将 API Base URL 修改为内网自部署模型地址（如 Ollama、vLLM），
              代码无需任何改动即可切换。推荐模型：Qwen2.5-Coder、DeepSeek-R1 本地版。
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
