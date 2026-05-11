import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil, FolderInput, Trash2, X } from 'lucide-react'

const MOBILE_BREAKPOINT = 767
const DESKTOP_MENU_WIDTH = 176
const VIEWPORT_MARGIN = 12

export default function CardMenu({ onDetail, onEdit, onMove, onDelete, onClose, anchorRef }) {
  const ref = useRef(null)
  const [isMobile, setIsMobile] = useState(() => window.innerWidth <= MOBILE_BREAKPOINT)
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' })

  const actions = useMemo(
    () => [
      { icon: <Info size={16} />, label: 'Detail', onClick: onDetail },
      { icon: <Pencil size={16} />, label: 'Edit', onClick: onEdit },
      { icon: <FolderInput size={16} />, label: 'Move to...', onClick: onMove },
      { icon: <Trash2 size={16} />, label: 'Delete', onClick: onDelete, danger: true },
    ],
    [onDelete, onDetail, onEdit, onMove]
  )

  useEffect(() => {
    function handleResize() {
      setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT)
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  useLayoutEffect(() => {
    if (isMobile || !anchorRef?.current) return
    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = ref.current?.offsetHeight ?? 170
    const spaceBelow = window.innerHeight - rect.bottom
    const spaceAbove = rect.top
    const placement = spaceBelow < menuHeight + VIEWPORT_MARGIN && spaceAbove > menuHeight
      ? 'top'
      : 'bottom'

    const top = placement === 'top'
      ? Math.max(VIEWPORT_MARGIN, rect.top - menuHeight - 8)
      : Math.min(window.innerHeight - menuHeight - VIEWPORT_MARGIN, rect.bottom + 8)

    const left = Math.min(
      window.innerWidth - DESKTOP_MENU_WIDTH - VIEWPORT_MARGIN,
      Math.max(VIEWPORT_MARGIN, rect.right - DESKTOP_MENU_WIDTH)
    )

    setPosition({ top, left, placement })
  }, [anchorRef, isMobile])

  useEffect(() => {
    function handlePointerDown(e) {
      const target = e.target
      if (ref.current?.contains(target) || anchorRef?.current?.contains(target)) return
      onClose()
    }

    function handleEscape(e) {
      if (e.key === 'Escape') onClose()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [anchorRef, onClose])

  useEffect(() => {
    if (!isMobile) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [isMobile])

  function renderItem(action, index) {
    const isDelete = action.danger
    return (
      <button
        key={action.label}
        onClick={(e) => {
          e.stopPropagation()
          action.onClick()
          onClose()
        }}
        className={`flex items-center gap-3 w-full text-left transition-colors ${
          isMobile
            ? `px-4 py-3 ${isDelete ? 'text-red-600 bg-red-50/70 mt-2 rounded-xl' : 'text-gray-800 hover:bg-gray-50'}`
            : `px-3 py-2 text-sm rounded ${isDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`
        }`}
      >
        {action.icon}
        <span className={isMobile ? 'text-[15px] font-medium' : ''}>{action.label}</span>
        {!isMobile && index === 2 && <span className="sr-only">Opens detail panel</span>}
      </button>
    )
  }

  if (isMobile) {
    return createPortal(
      <div className="fixed inset-0 z-50" onClick={onClose}>
        <div className="absolute inset-0 bg-black/40" />
        <div
          ref={ref}
          onClick={(e) => e.stopPropagation()}
          className="absolute bottom-0 left-0 right-0 mx-3 mb-3 rounded-2xl bg-white shadow-2xl overflow-hidden"
          style={{ paddingBottom: 'max(12px, env(safe-area-inset-bottom))' }}
        >
          <div className="flex items-center justify-between px-4 pt-4 pb-2 border-b border-gray-100">
            <span className="text-sm font-semibold text-gray-900">Actions</span>
            <button onClick={onClose} className="p-2 rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700">
              <X size={18} />
            </button>
          </div>
          <div className="px-2 py-2 max-h-[70vh] overflow-y-auto">
            {actions.slice(0, 3).map(renderItem)}
            <div className="my-2 border-t border-gray-100" />
            {renderItem(actions[3], 3)}
          </div>
        </div>
      </div>,
      document.body
    )
  }

  return createPortal(
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-40 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44"
      style={{ top: position.top, left: position.left }}
      data-placement={position.placement}
    >
      {actions.slice(0, 3).map(renderItem)}
      <div className="my-1 border-t border-gray-100" />
      {renderItem(actions[3], 3)}
    </div>,
    document.body
  )
}
