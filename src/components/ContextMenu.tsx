import { useState } from 'react'
import { Search, Copy, Code, Trash, Layers, Download, Eraser } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

interface MenuItemProps {
  icon: React.ReactNode
  label: string
  shortcut: string[]
  active?: boolean
  isDestructive?: boolean
  onClick?: () => void
}

function MenuItem({ icon, label, shortcut, active, isDestructive, onClick }: MenuItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-all group",
        active
          ? 'bg-white/10 text-white shadow-sm'
          : 'hover:bg-white/5 text-slate-400 hover:text-white',
        isDestructive && 'hover:text-red-400'
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "transition-colors",
          active ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'
        )}>
          {icon}
        </span>
        <span className="font-medium tracking-wide">{label}</span>
      </div>

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

interface ContextMenuProps {
  x: number
  y: number
  imageId?: string
  imageName?: string
  onClose: () => void
  onAction: (action: string) => void
}

export function ContextMenu({ x, y, imageId, imageName: _imageName, onClose, onAction }: ContextMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const menuItems = [
    { icon: <Layers size={16} />, label: 'Focus', shortcut: ['F'], action: 'open' },
    { icon: <Eraser size={16} />, label: 'Remove Background', shortcut: ['⌘', 'R'], action: 'remove-bg' },
    { icon: <Copy size={16} />, label: 'Copy Asset Link', shortcut: ['⌘', 'C'], action: 'copy' },
    { icon: <Download size={16} />, label: 'Download', shortcut: ['⌘', 'D'], action: 'download' },
    { icon: <Code size={16} />, label: 'View JSON Source', shortcut: ['⌘', 'J'], action: 'json' },
  ]

  const filteredItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40" onClick={onClose} />

      <div
        style={{ top: y, left: x }}
        className="fixed z-50 w-72 origin-top-left animate-in fade-in zoom-in-95 duration-200"
      >
        <div className="bg-[#1A1B25]/70 backdrop-blur-xl saturate-150 border border-white/10 ring-1 ring-white/5 rounded-xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] overflow-hidden text-slate-300">
          {/* Search Bar */}
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

          {/* Actions List */}
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

            <Separator className="my-1 mx-2 bg-white/10" />

            {/* Destructive Action */}
            <MenuItem
              icon={<Trash size={16} />}
              label="Delete Asset"
              shortcut={['⌘', '⌫']}
              isDestructive
              onClick={() => {
                onAction('delete')
                onClose()
              }}
            />
          </div>

          {/* Footer */}
          <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex justify-between items-center">
            <span className="text-[10px] font-mono text-muted-foreground">
              {imageId ? `ID: ${imageId.slice(0, 8)}` : 'No selection'}
            </span>
            <span className="text-[10px] font-mono text-muted-foreground">LUYA v1.0</span>
          </div>
        </div>
      </div>
    </>
  )
}
