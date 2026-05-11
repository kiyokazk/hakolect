import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil, FolderInput, Trash2, X } from 'lucide-react'
import useAppStore from '../store/useAppStore'

const TABLET_MAX_WIDTH = 1023
const DESKTOP_MENU_WIDTH = 176
const VIEWPORT_MARGIN = 12
const MENU_OFFSET = 8

function getPointerState() {
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  return window.matchMedia('(pointer: coarse)').matches
}

export default function CardMenu({ onDetail, onEdit, onMove, onDelete, onClose, anchorRef }) {
  const ref = useRef(null)
  const detailPanelOpen = useAppStore((s) => s.detailPanelOpen)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [isCoarsePointer, setIsCoarsePointer] = useState(getPointerState)
  const [position, setPosition] = useState({ top: 0, left: 0, placement: 'bottom' })
  const [useActionSheet, setUseActionSheet] = useState(true)

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
      setViewport({ width: window.innerWidth, height: window.innerHeight })
      setIsCoarsePointer(getPointerState())
    }

    handleResize()
    window.addEventListener('resize', handleResize)
    window.addEventListener('orientationchange', handleResize)
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  useLayoutEffect(() => {
    if (!anchorRef?.current) return

    const rect = anchorRef.current.getBoundingClientRect()
    const menuHeight = ref.current?.offsetHeight ?? 170
    const detailPanel = document.querySelector('[data-hakolect-detail-panel="true"]')
    const detailRect = detailPanel?.getBoundingClientRect()
    const contentRightLimit = detailPanelOpen && detailRect ? detailRect.left - VIEWPORT_MARGIN : viewport.width - VIEWPORT_MARGIN
    const contentLeftLimit = VIEWPORT_MARGIN
    const verticalShortage = Math.max(rect.top, viewport.height - rect.bottom) < menuHeight + VIEWPORT_MARGIN
    const nearDetailPanel = Boolean(detailPanelOpen && detailRect && rect.right > detailRect.left - 96)
    const forceActionSheet =
      viewport.width <= TABLET_MAX_WIDTH ||
      isCoarsePointer ||
      verticalShortage ||
      nearDetailPanel

    setUseActionSheet(forceActionSheet)
    if (forceActionSheet) return

    const availableBelow = viewport.height - rect.bottom - VIEWPORT_MARGIN
    const availableAbove = rect.top - VIEWPORT_MARGIN
    const placement = availableBelow >= menuHeight + MENU_OFFSET || availableBelow >= availableAbove
      ? 'bottom'
      : 'top'

    const top = placement === 'top'
      ? Math.max(VIEWPORT_MARGIN, rect.top - menuHeight - MENU_OFFSET)
      : Math.min(viewport.height - menuHeight - VIEWPORT_MARGIN, rect.bottom + MENU_OFFSET)

    let left = rect.right - DESKTOP_MENU_WIDTH
    if (left < contentLeftLimit) left = contentLeftLimit
    if (left + DESKTOP_MENU_WIDTH > contentRightLimit) {
      left = Math.max(contentLeftLimit, contentRightLimit - DESKTOP_MENU_WIDTH)
    }

    setPosition({ top, left, placement })
  }, [anchorRef, detailPanelOpen, isCoarsePointer, viewport.height, viewport.width])

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
    if (!useActionSheet) return undefined
    const previous = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = previous
    }
  }, [useActionSheet])

  function renderItem(action) {
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
          useActionSheet
            ? `px-4 py-3 ${isDelete ? 'text-red-600 bg-red-50/70 mt-2 rounded-xl' : 'text-gray-800 hover:bg-gray-50'}`
            : `px-3 py-2 text-sm rounded ${isDelete ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'}`
        }`}
      >
        {action.icon}
        <span className={useActionSheet ? 'text-[15px] font-medium' : ''}>{action.label}</span>
      </button>
    )
  }

  if (useActionSheet) {
    return createPortal(
      <div className="fixed inset-0 z-[60]" onClick={onClose}>
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
            {renderItem(actions[3])}
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
      className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44"
      style={{ top: position.top, left: position.left }}
      data-placement={position.placement}
    >
      {actions.slice(0, 3).map(renderItem)}
      <div className="my-1 border-t border-gray-100" />
      {renderItem(actions[3])}
    </div>,
    document.body
  )
}
