import { useState, useRef, useEffect } from 'react'
import { Minus, Plus, Maximize, LayoutGrid } from 'lucide-react'
import { useStore } from '../store/useStore'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { cn } from '@/lib/utils'

const MIN_SCALE = 0.1
const MAX_SCALE = 5

interface MenuItemProps {
  label: string
  shortcut?: string
  onClick: () => void
}

const MenuItem = ({ label, shortcut, onClick }: MenuItemProps) => (
  <Button
    variant="ghost"
    onClick={onClick}
    className="w-full justify-between px-5 py-2 h-auto hover:bg-slate-50 hover:text-primary"
  >
    <span className="text-sm text-slate-700 group-hover:text-primary">{label}</span>
    {shortcut && (
      <span className="text-xs font-mono text-slate-400 group-hover:text-primary/70 flex items-center gap-1">
        {shortcut}
      </span>
    )}
  </Button>
)

export function ZoomControls() {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const { transform, setTransform, images, updateImage, isChatOpen } = useStore()

  // Calculate chat panel offset (w-96 = 384px + 16px margin + 16px padding)
  const chatPanelWidth = isChatOpen ? 416 : 0

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const zoomIn = () => {
    setTransform({ scale: Math.min(MAX_SCALE, transform.scale * 1.25) })
  }

  const zoomOut = () => {
    setTransform({ scale: Math.max(MIN_SCALE, transform.scale / 1.25) })
  }

  const zoomTo = (percentage: number) => {
    const newScale = percentage / 100

    if (images.length === 0) {
      setTransform({ scale: newScale, x: 0, y: 0 })
      setIsOpen(false)
      return
    }

    // Calculate bounding box of all images
    const minX = Math.min(...images.map((img) => img.x))
    const minY = Math.min(...images.map((img) => img.y))
    const maxX = Math.max(...images.map((img) => img.x + img.width))
    const maxY = Math.max(...images.map((img) => img.y + img.height))

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Get viewport size (account for chat panel)
    const viewportWidth = window.innerWidth - chatPanelWidth
    const viewportHeight = window.innerHeight

    // Calculate position to center content
    const centerX = minX + contentWidth / 2
    const centerY = minY + contentHeight / 2
    const x = viewportWidth / 2 - centerX * newScale
    const y = viewportHeight / 2 - centerY * newScale

    setTransform({ scale: newScale, x, y }, true)
    setIsOpen(false)
  }

  const fitToContent = () => {
    if (images.length === 0) {
      setTransform({ scale: 1, x: 0, y: 0 })
      setIsOpen(false)
      return
    }

    const minX = Math.min(...images.map((img) => img.x))
    const minY = Math.min(...images.map((img) => img.y))
    const maxX = Math.max(...images.map((img) => img.x + img.width))
    const maxY = Math.max(...images.map((img) => img.y + img.height))

    const contentWidth = maxX - minX
    const contentHeight = maxY - minY

    // Get viewport size (account for chat panel)
    const viewportWidth = window.innerWidth - chatPanelWidth
    const viewportHeight = window.innerHeight

    // Calculate scale to fit content with padding - allow scaling up
    const padding = 60
    const scaleX = (viewportWidth - padding * 2) / contentWidth
    const scaleY = (viewportHeight - padding * 2) / contentHeight
    // Use the smaller scale to fit, but cap at MAX_SCALE
    const scale = Math.min(scaleX, scaleY, MAX_SCALE)

    // Calculate position to center content in the visible area (left of chat panel)
    const centerX = minX + contentWidth / 2
    const centerY = minY + contentHeight / 2
    const x = viewportWidth / 2 - centerX * scale
    const y = viewportHeight / 2 - centerY * scale

    setTransform({ scale, x, y }, true)
    setIsOpen(false)
  }

  const autoLayout = () => {
    if (images.length === 0) return

    setIsOpen(false)

    const gap = 24
    const padding = 60
    const sortedImages = [...images].sort((a, b) => a.createdAt - b.createdAt)

    // Get viewport size (account for chat panel)
    const viewportWidth = window.innerWidth - chatPanelWidth
    const viewportHeight = window.innerHeight
    const availableWidth = viewportWidth - padding * 2
    const availableHeight = viewportHeight - padding * 2

    // Calculate layout with packed positioning (no cell centering)
    const calculatePackedLayout = (cols: number) => {
      const rows = Math.ceil(sortedImages.length / cols)

      // Calculate actual positions for each image
      const positions: { x: number; y: number }[] = []
      const rowHeights: number[] = new Array(rows).fill(0)

      // First pass: determine row heights
      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const idx = row * cols + col
          if (idx < sortedImages.length) {
            rowHeights[row] = Math.max(rowHeights[row], sortedImages[idx].height)
          }
        }
      }

      // Second pass: position images with direct edge-to-edge gaps
      let totalWidth = 0

      for (let row = 0; row < rows; row++) {
        let currentX = 0
        const rowStartIdx = row * cols
        const rowEndIdx = Math.min(rowStartIdx + cols, sortedImages.length)

        // Calculate y position for this row
        let y = 0
        for (let r = 0; r < row; r++) {
          y += rowHeights[r] + gap
        }

        // Position each image in the row
        for (let idx = rowStartIdx; idx < rowEndIdx; idx++) {
          const img = sortedImages[idx]
          // Vertically align to top of row
          positions[idx] = { x: currentX, y }
          currentX += img.width + gap
        }

        // Track max width (subtract last gap)
        const rowWidth = currentX - gap
        totalWidth = Math.max(totalWidth, rowWidth)
      }

      const totalHeight = rowHeights.reduce((sum, h) => sum + h, 0) + (rows - 1) * gap

      // Calculate the scale needed to fit this layout
      const scaleX = availableWidth / totalWidth
      const scaleY = availableHeight / totalHeight
      const scale = Math.min(scaleX, scaleY, MAX_SCALE)

      return { cols, rows, positions, totalWidth, totalHeight, scale }
    }

    // Try different column counts and find the one that results in largest images
    let bestLayout = calculatePackedLayout(1)

    for (let cols = 2; cols <= sortedImages.length; cols++) {
      const layout = calculatePackedLayout(cols)
      // Prefer layout with larger scale (bigger images on screen)
      if (layout.scale > bestLayout.scale) {
        bestLayout = layout
      }
    }

    const { positions, totalWidth, totalHeight, scale } = bestLayout

    // Position images
    sortedImages.forEach((img, index) => {
      updateImage(img.id, { x: positions[index].x, y: positions[index].y })
    })

    // Center and fit to screen
    setTimeout(() => {
      const x = viewportWidth / 2 - (totalWidth / 2) * scale
      const y = viewportHeight / 2 - (totalHeight / 2) * scale

      setTransform({ scale, x, y }, true)
    }, 50)
  }

  const zoomPercentage = Math.round(transform.scale * 100)

  return (
    <div ref={menuRef} className="absolute bottom-6 left-6 flex flex-col items-start gap-2 z-50">

      {/* Popover Menu */}
      {isOpen && (
        <div className="w-56 bg-white/95 backdrop-blur-sm border border-slate-100 rounded-2xl shadow-[0_8px_30px_rgb(0,0,0,0.08)] py-2 mb-1">

          {/* Actions */}
          <div className="flex flex-col">
            <MenuItem label="Zoom in" shortcut="⌘ +" onClick={zoomIn} />
            <MenuItem label="Zoom out" shortcut="⌘ -" onClick={zoomOut} />
            <MenuItem label="Fit to Screen" shortcut="⇧ 1" onClick={fitToContent} />
            <MenuItem label="Auto Layout" shortcut="⇧ 2" onClick={autoLayout} />
          </div>

          {/* Divider */}
          <Separator className="my-2 mx-4" />

          {/* Presets */}
          <div className="flex flex-col">
            <MenuItem label="Zoom to 50%" onClick={() => zoomTo(50)} />
            <MenuItem label="Zoom to 100%" onClick={() => zoomTo(100)} />
            <MenuItem label="Zoom to 200%" onClick={() => zoomTo(200)} />
          </div>
        </div>
      )}

      {/* Trigger Pill */}
      <div className="bg-white border border-slate-200 shadow-lg shadow-slate-200/50 rounded-full h-10 flex items-center px-1">

        {/* Minus Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomOut}
          className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-500 hover:text-primary"
          title="Zoom out (Cmd -)"
        >
          <Minus size={16} />
        </Button>

        {/* Percentage (clickable for menu) */}
        <Button
          variant="ghost"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 h-full text-sm font-mono text-slate-700 hover:text-slate-900 hover:bg-transparent min-w-[60px]"
        >
          {zoomPercentage}%
        </Button>

        {/* Plus Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={zoomIn}
          className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-500 hover:text-primary"
          title="Zoom in (Cmd +)"
        >
          <Plus size={16} />
        </Button>

        {/* Divider */}
        <Separator orientation="vertical" className="h-5 mx-1" />

        {/* Fit to Screen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={fitToContent}
          className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-500 hover:text-primary"
          title="Fit to content"
        >
          <Maximize size={16} />
        </Button>

        {/* Auto Layout */}
        <Button
          variant="ghost"
          size="icon"
          onClick={autoLayout}
          className="w-8 h-8 rounded-full hover:bg-slate-50 text-slate-500 hover:text-primary"
          title="Auto-arrange images"
        >
          <LayoutGrid size={16} />
        </Button>

      </div>
    </div>
  )
}
