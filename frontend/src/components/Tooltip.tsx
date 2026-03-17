import { useRef, useState, cloneElement } from 'react'
import { createPortal } from 'react-dom'

interface TooltipProps {
  content: string
  children: React.ReactElement
  placement?: 'top' | 'bottom' | 'left' | 'right'
}

export default function Tooltip({ content, children, placement = 'top' }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const [pos, setPos] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLElement>(null)

  const updatePos = () => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    const gap = 7
    let top = 0
    let left = 0
    if (placement === 'top') {
      top = rect.top - gap
      left = rect.left + rect.width / 2
    } else if (placement === 'bottom') {
      top = rect.bottom + gap
      left = rect.left + rect.width / 2
    } else if (placement === 'right') {
      top = rect.top + rect.height / 2
      left = rect.right + gap
    } else {
      top = rect.top + rect.height / 2
      left = rect.left - gap
    }
    setPos({ top, left })
  }

  const show = () => { updatePos(); setVisible(true) }
  const hide = () => setVisible(false)

  if (!content) return <>{children}</>

  const trigger = cloneElement(children as React.ReactElement<any>, {
    ref: triggerRef,
    onMouseEnter: (e: React.MouseEvent) => {
      show()
      ;(children.props as any).onMouseEnter?.(e)
    },
    onMouseLeave: (e: React.MouseEvent) => {
      hide()
      ;(children.props as any).onMouseLeave?.(e)
    },
  })

  const placementStyles: Record<string, React.CSSProperties> = {
    top:    { transform: 'translate(-50%, -100%)', paddingBottom: 6 },
    bottom: { transform: 'translate(-50%, 0%)',   paddingTop: 6 },
    right:  { transform: 'translate(0%, -50%)',   paddingLeft: 6 },
    left:   { transform: 'translate(-100%, -50%)',paddingRight: 6 },
  }

  const arrowPos: Record<string, React.CSSProperties> = {
    top:    { bottom: 2,  left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    bottom: { top: 2,    left: '50%', transform: 'translateX(-50%) rotate(45deg)' },
    right:  { left: 2,   top: '50%',  transform: 'translateY(-50%) rotate(45deg)' },
    left:   { right: 2,  top: '50%',  transform: 'translateY(-50%) rotate(45deg)' },
  }

  return (
    <>
      {trigger}
      {visible && createPortal(
        <div
          style={{
            position: 'fixed',
            top: pos.top,
            left: pos.left,
            zIndex: 9999,
            pointerEvents: 'none',
            ...placementStyles[placement],
          }}
        >
          <div
            style={{
              background: 'rgba(15,23,42,0.93)',
              color: '#e2e8f0',
              fontSize: 12,
              lineHeight: 1.6,
              padding: '5px 9px',
              borderRadius: 6,
              maxWidth: 280,
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-all',
              boxShadow: '0 4px 14px rgba(0,0,0,0.22)',
              position: 'relative',
            }}
          >
            {content}
            <span
              style={{
                position: 'absolute',
                width: 7,
                height: 7,
                background: 'rgba(15,23,42,0.93)',
                ...arrowPos[placement],
              }}
            />
          </div>
        </div>,
        document.body
      )}
    </>
  )
}
