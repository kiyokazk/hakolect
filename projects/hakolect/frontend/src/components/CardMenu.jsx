import { useEffect, useRef } from 'react'
import { Info, Pencil, FolderInput, Trash2 } from 'lucide-react'

export default function CardMenu({ onDetail, onEdit, onMove, onDelete, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    function handleOutside(e) {
      if (ref.current && !ref.current.contains(e.target)) {
        onClose()
      }
    }
    document.addEventListener('mousedown', handleOutside)
    return () => document.removeEventListener('mousedown', handleOutside)
  }, [onClose])

  const item = (icon, label, onClick, danger = false) => (
    <button
      onClick={(e) => {
        e.stopPropagation()
        onClick()
        onClose()
      }}
      className={`flex items-center gap-2 w-full px-3 py-2 text-sm text-left hover:bg-gray-50 transition-colors rounded ${
        danger ? 'text-red-600 hover:bg-red-50' : 'text-gray-700'
      }`}
    >
      {icon}
      {label}
    </button>
  )

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      className="absolute right-2 top-8 z-30 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44"
    >
      {item(<Info size={14} />, 'Detail', onDetail)}
      {item(<Pencil size={14} />, 'Edit', onEdit)}
      {item(<FolderInput size={14} />, 'Move to...', onMove)}
      <div className="my-1 border-t border-gray-100" />
      {item(<Trash2 size={14} />, 'Delete', onDelete, true)}
    </div>
  )
}
