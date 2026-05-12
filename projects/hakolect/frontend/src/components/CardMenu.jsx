import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Info, Pencil, FolderInput, Trash2 } from 'lucide-react'
import useAppStore from '../store/useAppStore'

const DESKTOP_MENU_WIDTH = 176
const VIEWPORT_MARGIN = 12
const MENU_OFFSET = 8
const MAX_MENU_HEIGHT = 220

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max)
}

function isOriginRect(rect) {
  return rect.x === 0 && rect.y === 0 && rect.width === 0 && rect.height === 0
}

function getAnchorRect(anchorRef) {
  const anchor = anchorRef?.current
  if (!anchor) return null

  const candidates = [anchor, anchor.querySelector?.('svg')].filter(Boolean)
  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect?.()
    if (!rect || isOriginRect(rect)) continue
    return rect
  }

  return null
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

  const updatePosition = useCallback(() => {
    if (!ref.current) return

    const rect = getAnchorRect(anchorRef)
    if (!rect) {
      setPosition((current) => current)
      return
    }

    const measuredMenuHeight = ref.current.offsetHeight || 170
    const menuHeight = Math.min(measuredMenuHeight, MAX_MENU_HEIGHT)
    const detailPanel = document.querySelector('[data-hakolect-detail-panel="true"]')
    const detailRect = detailPanel?.getBoundingClientRect()
    const leftLimit = VIEWPORT_MARGIN
    const rightLimitBase = detailPanelOpen && detailRect
      ? detailRect.left - VIEWPORT_MARGIN
      : viewport.width - VIEWPORT_MARGIN
    const rightLimit = Math.max(leftLimit + DESKTOP_MENU_WIDTH, rightLimitBase)

    const availableBelow = viewport.height - rect.bottom - VIEWPORT_MARGIN
    const availableAbove = rect.top - VIEWPORT_MARGIN
    const shouldFlipUp = availableBelow < menuHeight + MENU_OFFSET && availableAbove > availableBelow

    const top = shouldFlipUp
      ? clamp(rect.top - menuHeight - MENU_OFFSET, VIEWPORT_MARGIN, viewport.height - menuHeight - VIEWPORT_MARGIN)
      : clamp(rect.bottom + MENU_OFFSET, VIEWPORT_MARGIN, viewport.height - menuHeight - VIEWPORT_MARGIN)

    const idealLeft = rect.right - DESKTOP_MENU_WIDTH
    const left = clamp(idealLeft, leftLimit, rightLimit - DESKTOP_MENU_WIDTH)
    const maxHeight = Math.max(120, Math.min(MAX_MENU_HEIGHT, viewport.height - VIEWPORT_MARGIN * 2))

    setPosition((current) => {
      if (
        current &&
        current.top === top &&
        current.left === left &&
        current.maxHeight === maxHeight
      ) {
        return current
      }
      return { top, left, maxHeight }
    })
  }, [anchorRef, detailPanelOpen, viewport.height, viewport.width])

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

  useEffect(() => {
    if (position) return

    let rafId = null
    let attempts = 0

    function applyFallbackPosition() {
      const rect = getAnchorRect(anchorRef)
      if (rect) {
        const fallbackHeight = 170
        const fallbackTop = clamp(
          rect.bottom + MENU_OFFSET,
          VIEWPORT_MARGIN,
          viewport.height - fallbackHeight - VIEWPORT_MARGIN
        )
        const fallbackLeft = clamp(
          rect.right - DESKTOP_MENU_WIDTH,
          VIEWPORT_MARGIN,
          viewport.width - DESKTOP_MENU_WIDTH - VIEWPORT_MARGIN
        )

        setPosition({ top: fallbackTop, left: fallbackLeft, maxHeight: MAX_MENU_HEIGHT })
        return
      }

      if (attempts < 10) {
        attempts += 1
        rafId = window.requestAnimationFrame(applyFallbackPosition)
      }
    }

    applyFallbackPosition()
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId)
    }
  }, [anchorRef, position, viewport.height, viewport.width])

  useLayoutEffect(() => {
    updatePosition()

    const rafId = window.requestAnimationFrame(updatePosition)
    return () => window.cancelAnimationFrame(rafId)
  }, [updatePosition])

  useEffect(() => {
    function handlePointerDown(e) {
      const target = e.target
      if (ref.current?.contains(target) || anchorRef?.current?.contains(target)) return
      onClose()
    }

    function handleEscape(e) {
      if (e.key === 'Escape') onClose()
    }

    function handleScroll() {
      updatePosition()
    }

    document.addEventListener('mousedown', handlePointerDown)
    document.addEventListener('touchstart', handlePointerDown)
    document.addEventListener('keydown', handleEscape)
    window.addEventListener('scroll', handleScroll, true)
    return () => {
      document.removeEventListener('mousedown', handlePointerDown)
      document.removeEventListener('touchstart', handlePointerDown)
      document.removeEventListener('keydown', handleEscape)
      window.removeEventListener('scroll', handleScroll, true)
    }
  }, [anchorRef, onClose, updatePosition])

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

  return createPortal(
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-[60] bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44 overflow-y-auto"
      style={{
        top: position?.top ?? VIEWPORT_MARGIN,
        left: position?.left ?? VIEWPORT_MARGIN,
        maxHeight: position?.maxHeight ?? MAX_MENU_HEIGHT,
        visibility: 'visible',
      }}
    >
      {actions.slice(0, 3).map(renderItem)}
      <div className="my-1 border-t border-gray-100" />
      {renderItem(actions[3])}
    </div>,
    document.body
  )
}
