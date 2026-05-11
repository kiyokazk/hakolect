import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil, FolderInput, Trash2 } from 'lucide-react'
import useAppStore from '../store/useAppStore'

const DESKTOP_MENU_WIDTH = 176
const VIEWPORT_MARGIN = 12
const MENU_OFFSET = 8
const MAX_MENU_HEIGHT = 220

function getAnchorRect(anchorRef) {
  return anchorRef?.current?.getBoundingClientRect?.() ?? null
}

export default function CardMenu({ onDetail, onEdit, onMove, onDelete, onClose, anchorRef }) {
  const ref = useRef(null)
  const detailPanelOpen = useAppStore((s) => s.detailPanelOpen)
  const [viewport, setViewport] = useState(() => ({ width: window.innerWidth, height: window.innerHeight }))
  const [position, setPosition] = useState(null)

  const actions = useMemo(
    () => [
      { icon: <Info size={14} />, label: 'Detail', onClick: onDetail },
      { icon: <Pencil size={14} />, label: 'Edit', onClick: onEdit },
      { icon: <FolderInput size={14} />, label: 'Move to...', onClick: onMove },
      { icon: <Trash2 size={14} />, label: 'Delete', onClick: onDelete, danger: true },
    ],
    [onDelete, onDetail, onEdit, onMove]
  )

  useEffect(() => {
    function handleResize() {
      setViewport({ width: window.innerWidth, height: window.innerHeight })
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
    const rect = getAnchorRect(anchorRef)
    if (!rect) return
    const menuHeight = ref.current?.offsetHeight ?? 170
    const detailPanel = document.querySelector('[data-hakolect-detail-panel="true"]')
    const detailRect = detailPanel?.getBoundingClientRect()
    const rightLimit = detailPanelOpen && detailRect
      ? detailRect.left - VIEWPORT_MARGIN
      : viewport.width - VIEWPORT_MARGIN
    const leftLimit = VIEWPORT_MARGIN

    const availableBelow = viewport.height - rect.bottom - VIEWPORT_MARGIN
    const availableAbove = rect.top - VIEWPORT_MARGIN
    const shouldFlipUp = availableBelow < menuHeight + MENU_OFFSET && availableAbove > availableBelow

    const idealTop = shouldFlipUp
      ? rect.top - menuHeight - MENU_OFFSET
      : rect.bottom + MENU_OFFSET
    const top = Math.max(
      VIEWPORT_MARGIN,
      Math.min(idealTop, viewport.height - Math.min(menuHeight, MAX_MENU_HEIGHT) - VIEWPORT_MARGIN)
    )

    let left = rect.right - DESKTOP_MENU_WIDTH
    if (left < leftLimit) left = leftLimit
    if (left + DESKTOP_MENU_WIDTH > rightLimit) {
      left = Math.max(leftLimit, rightLimit - DESKTOP_MENU_WIDTH)
    }

    const maxHeight = Math.max(120, Math.min(MAX_MENU_HEIGHT, viewport.height - VIEWPORT_MARGIN * 2))
    setPosition({ top, left, maxHeight })
  }, [anchorRef, detailPanelOpen, viewport.height, viewport.width])

  useEffect(() => {
    if (position) return
    const rect = getAnchorRect(anchorRef)
    if (!rect) return

    const fallbackTop = Math.max(VIEWPORT_MARGIN, Math.min(rect.bottom + MENU_OFFSET, viewport.height - MAX_MENU_HEIGHT - VIEWPORT_MARGIN))
    const fallbackLeft = Math.max(
      VIEWPORT_MARGIN,
      Math.min(rect.right - DESKTOP_MENU_WIDTH, viewport.width - DESKTOP_MENU_WIDTH - VIEWPORT_MARGIN)
    )
    setPosition({ top: fallbackTop, left: fallbackLeft, maxHeight: MAX_MENU_HEIGHT })
  }, [anchorRef, position, viewport.height, viewport.width])

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

  function renderItem(action) {
    return (
      <button
        key={action.label}
        onClick={(e) => {
          e.stopPropagation()
          action.onClick()
          onClose()
        }}
        className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left transition-colors rounded ${
          action.danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700 hover:bg-gray-50'
        }`}
      >
        {action.icon}
        <span>{action.label}</span>
      </button>
    )
  }

  if (!position) return null

  return createPortal(
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 overflow-y-auto"
      style={{ top: position.top, left: position.left, maxHeight: position.maxHeight }}
    >
      {actions.slice(0, 3).map(renderItem)}
      <div className="my-1 border-t border-gray-100" />
      {renderItem(actions[3])}
    </div>,
    document.body
  )
}
