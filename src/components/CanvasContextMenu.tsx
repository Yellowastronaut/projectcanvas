import { useState } from 'react'
import { Search, RotateCcw, Maximize2, ZoomIn, Grid3X3, Upload, Type } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  shortcut: string[]
  active?: boolean
  onClick?: () => void
}

function MenuItem({ icon, label, shortcut, active, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group",
        active
          ? 'bg-white/10 text-white shadow-sm'
          : 'hover:bg-white/5 text-slate-400 hover:text-white'
      )}
    >
      {/* Left: Icon & Text */}
      <div className="flex items-center gap-3">
        <span className={cn(
          "transition-colors",
          active ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'
        )}>
          {icon}
        </span>
        <span className="font-medium tracking-wide">{label}</span>
      </div>

      {/* Right: Shortcuts (Key Caps style) */}
      <div className="flex items-center gap-1">
        {shortcut.map((key, i) => (
          <span
            key={i}
            className={cn(
              "min-w-[20px] h-5 flex items-center justify-center text-[10px] font-mono rounded-[4px] border px-1",
              active
                ? 'bg-black/20 border-white/20 text-slate-300'
                : 'bg-[#2A2B35] border-white/10 text-slate-500'
            )}
          >
            {key}
          </span>
        ))}
      </div>
    </button>
  )
}

interface CanvasContextMenuProps {
  x: number
  y: number
  onClose: () => void
  onAction: (action: string) => void
}

export function CanvasContextMenu({ x, y, onClose, onAction }: CanvasContextMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const menuItems = [
    { icon: <Upload size={16} />, label: 'Upload Image', shortcut: ['⌘', 'U'], action: 'upload' },
    { icon: <Type size={16} />, label: 'Add Text', shortcut: ['T'], action: 'add-text' },
    { icon: <Maximize2 size={16} />, label: 'Fit All', shortcut: ['⌘', '1'], action: 'fit-all' },
    { icon: <RotateCcw size={16} />, label: 'Reset View', shortcut: ['⌘', '0'], action: 'reset-view' },
    { icon: <ZoomIn size={16} />, label: 'Zoom to 100%', shortcut: ['⌘', '='], action: 'zoom-100' },
    { icon: <Grid3X3 size={16} />, label: 'Toggle Grid', shortcut: ['G'], action: 'toggle-grid' },
  ]

  const filteredItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Backdrop to close menu */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        style={{ top: y, left: x }}
        className="fixed z-50 w-64 origin-top-left animate-in fade-in zoom-in-95 duration-200"
      >
        {/* CONTAINER: Deep Glass Style with Inner Light */}
        <div className="bg-[#1A1B25]/70 backdrop-blur-xl saturate-150 border border-white/10 ring-1 ring-white/5 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden text-slate-300">
          {/* 1. SEARCH BAR */}
          <div className="flex items-center px-3 py-3 border-b border-white/5 bg-transparent">
            <Search className="w-4 h-4 text-slate-500 mr-2" />
            <Input
              type="text"
              placeholder="Search action..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-transparent border-none shadow-none focus-visible:ring-0 text-sm text-white placeholder-slate-400 h-auto p-0"
              autoFocus
            />
          </div>

          {/* 2. ACTIONS LIST */}
          <div className="p-1.5 space-y-0.5">
            {filteredItems.map((item, index) => (
              <MenuItem
                key={item.action}
                icon={item.icon}
                label={item.label}
                shortcut={item.shortcut}
                active={index === 0 && !searchQuery}
                onClick={() => {
                  onAction(item.action)
                  onClose()
                }}
              />
            ))}
          </div>

          {/* 3. FOOTER */}
          <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-mono text-slate-500">
              Canvas
            </span>
            <span className="text-[10px] font-mono text-slate-500">LUYA v1.0</span>
          </div>
        </div>
      </div>
    </>
  )
}
