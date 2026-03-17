import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { CheckCircle2, XCircle, AlertCircle, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info'

interface ToastItem {
  id: number
  message: string
  type: ToastType
}

// 全局发布订阅
type Listener = (item: ToastItem) => void
const listeners: Listener[] = []
let _id = 0

export const toast = {
  success: (message: string) => emit({ id: ++_id, message, type: 'success' }),
  error: (message: string) => emit({ id: ++_id, message, type: 'error' }),
  info: (message: string) => emit({ id: ++_id, message, type: 'info' }),
}

function emit(item: ToastItem) {
  listeners.forEach(fn => fn(item))
}

const iconMap = {
  success: <CheckCircle2 size={15} className="text-emerald-500 shrink-0 mt-0.5" />,
  error: <XCircle size={15} className="text-red-500 shrink-0 mt-0.5" />,
  info: <AlertCircle size={15} className="text-blue-500 shrink-0 mt-0.5" />,
}

const borderMap = {
  success: 'border-emerald-200 bg-emerald-50',
  error: 'border-red-200 bg-red-50',
  info: 'border-blue-200 bg-blue-50',
}

const textMap = {
  success: 'text-emerald-800',
  error: 'text-red-800',
  info: 'text-blue-800',
}

function ToastItem({ item, onRemove }: { item: ToastItem; onRemove: () => void }) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    // 触发进入动画
    requestAnimationFrame(() => setVisible(true))
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(onRemove, 300)
    }, 3000)
    return () => clearTimeout(timer)
  }, [])

  return (
    <div
      style={{
        transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateY(0) scale(1)' : 'translateY(12px) scale(0.96)',
      }}
      className={`flex items-start gap-2.5 px-3.5 py-2.5 rounded-lg border shadow-lg text-sm min-w-[200px] max-w-[320px] ${borderMap[item.type]}`}
    >
      {iconMap[item.type]}
      <span className={`flex-1 leading-relaxed ${textMap[item.type]}`}>{item.message}</span>
      <button
        onClick={() => { setVisible(false); setTimeout(onRemove, 300) }}
        className="text-slate-400 hover:text-slate-600 shrink-0 mt-0.5"
      >
        <X size={13} />
      </button>
    </div>
  )
}

export default function ToastContainer() {
  const [items, setItems] = useState<ToastItem[]>([])

  useEffect(() => {
    const handler: Listener = (item) => {
      setItems(prev => [...prev, item])
    }
    listeners.push(handler)
    return () => {
      const idx = listeners.indexOf(handler)
      if (idx >= 0) listeners.splice(idx, 1)
    }
  }, [])

  if (items.length === 0) return null

  return createPortal(
    <div
      style={{
        position: 'fixed',
        top: 20,
        right: 20,
        zIndex: 10000,
        display: 'flex',
        flexDirection: 'column',
        gap: 10,
        alignItems: 'flex-end',
      }}
    >
      {items.map(item => (
        <ToastItem
          key={item.id}
          item={item}
          onRemove={() => setItems(prev => prev.filter(i => i.id !== item.id))}
        />
      ))}
    </div>,
    document.body
  )
}

