import { useState } from 'react'
import { Search, Copy, Code, Trash, Layers, Download, Eraser } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

interface ContextMenuProps {
  x: number
  y: number
  imageId?: string
  imageName?: string
  onClose: () => void
  onAction: (action: string) => void
}

const menuItems = [
  { icon: <Layers size={16} />, label: 'Focus', shortcut: 'F', action: 'open' },
  { icon: <Eraser size={16} />, label: 'Remove Background', shortcut: '⌘R', action: 'remove-bg' },
  { icon: <Copy size={16} />, label: 'Copy Asset Link', shortcut: '⌘C', action: 'copy' },
  { icon: <Download size={16} />, label: 'Download', shortcut: '⌘D', action: 'download' },
  { icon: <Code size={16} />, label: 'View JSON Source', shortcut: '⌘J', action: 'json' },
]

export function ContextMenu({ x, y, imageId, onClose, onAction }: ContextMenuProps) {
  const [searchQuery, setSearchQuery] = useState('')

  const filteredItems = menuItems.filter((item) =>
    item.label.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleAction = (action: string) => {
    onAction(action)
    onClose()
  }

  return (
    <DropdownMenu open={true} onOpenChange={(open) => !open && onClose()}>
      <DropdownMenuContent
        className="w-72 bg-[#1A1B25]/95 backdrop-blur-xl saturate-150 border-white/10 ring-1 ring-white/5 shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)] text-slate-300 p-0"
        style={{
          position: 'fixed',
          top: y,
          left: x,
        }}
        align="start"
        sideOffset={0}
      >
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
        <div className="p-1.5">
          {filteredItems.map((item, index) => (
            <DropdownMenuItem
              key={item.action}
              onClick={() => handleAction(item.action)}
              className={cn(
                "px-3 py-2 rounded-lg text-sm cursor-pointer group",
                index === 0 && !searchQuery
                  ? 'bg-white/10 text-white'
                  : 'text-slate-400 hover:bg-white/5 hover:text-white focus:bg-white/5 focus:text-white'
              )}
            >
              <span className={cn(
                "mr-3 transition-colors",
                index === 0 && !searchQuery ? 'text-primary' : 'text-slate-500 group-hover:text-slate-300'
              )}>
                {item.icon}
              </span>
              <span className="font-medium tracking-wide">{item.label}</span>
              <DropdownMenuShortcut className="ml-auto text-[10px] font-mono opacity-50">
                {item.shortcut}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          ))}

          <DropdownMenuSeparator className="my-1 mx-2 bg-white/10" />

          {/* Destructive Action */}
          <DropdownMenuItem
            onClick={() => handleAction('delete')}
            className="px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-red-400 hover:bg-white/5 focus:text-red-400 focus:bg-white/5 cursor-pointer group"
          >
            <span className="mr-3 text-slate-500 group-hover:text-red-400">
              <Trash size={16} />
            </span>
            <span className="font-medium tracking-wide">Delete Asset</span>
            <DropdownMenuShortcut className="ml-auto text-[10px] font-mono opacity-50">
              ⌘⌫
            </DropdownMenuShortcut>
          </DropdownMenuItem>
        </div>

        {/* Footer */}
        <div className="px-3 py-1.5 bg-black/20 border-t border-white/5 flex justify-between items-center">
          <span className="text-[10px] font-mono text-muted-foreground">
            {imageId ? `ID: ${imageId.slice(0, 8)}` : 'No selection'}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground">LUYA v1.0</span>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
