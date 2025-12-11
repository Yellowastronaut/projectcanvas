import { useState, useRef } from 'react'
import { ArrowRight, GripHorizontal, Loader2 } from 'lucide-react'
import type { ImageItem } from '../store/types'
import { useStore } from '../store/useStore'
import { submitImageEdit } from '../api/n8n'

interface Props {
  image: ImageItem
  scale: number
  onClose: () => void
}

export function ImageEditPanel({ image, scale, onClose }: Props) {
  const [input, setInput] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 })
  const inputRef = useRef<HTMLTextAreaElement>(null)

  const { addImage, updateImage, removeImage } = useStore()

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    setIsLoading(true)
    setError(null)

    // Create a placeholder image while generating
    const placeholderId = addImage({
      src: '',
      x: image.x + image.width + 50,
      y: image.y,
      width: image.width,
      height: image.height,
      name: `${image.name}_edited`,
      isGenerating: true,
    })

    try {
      const result = await submitImageEdit({
        imageId: image.id,
        imageSrc: image.src,
        imageName: image.name,
        editPrompt: input,
        originalPrompt: image.metadata?.prompt,
        originalModel: image.metadata?.model,
      })

      if (result.success && result.imageUrl) {
        updateImage(placeholderId, {
          src: result.imageUrl,
          isGenerating: false,
          metadata: result.metadata,
        })
        setInput('')
        onClose()
      } else {
        removeImage(placeholderId)
        setError(result.error || 'Failed to edit image')
      }
    } catch (err) {
      removeImage(placeholderId)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    if (e.key === 'Escape') {
      onClose()
    }
    e.stopPropagation()
  }

  // Handle drag start for moving the panel
  const handleDragStart = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      posX: position.x,
      posY: position.y,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - dragRef.current.startX) / scale
      const deltaY = (moveEvent.clientY - dragRef.current.startY) / scale
      setPosition({
        x: dragRef.current.posX + deltaX,
        y: dragRef.current.posY + deltaY,
      })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={`absolute left-1/2 z-50 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        top: image.height + 70 / scale + position.y,
        left: `calc(50% + ${position.x}px)`,
        transform: `translateX(-50%) scale(${1 / scale})`,
        transformOrigin: 'top center',
        width: 420,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Panel Container */}
      <div className="
        relative z-50
        bg-[#1A1B25]/70 backdrop-blur-xl saturate-150
        border border-white/10 ring-1 ring-white/5
        rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
        flex flex-col
        animate-in slide-in-from-bottom-2 duration-300
      ">
        {/* Header with Drag Handle */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/5 bg-transparent">
          <div className="flex items-center gap-3">
            {/* Drag Handle */}
            <div
              className="cursor-grab active:cursor-grabbing p-1 -ml-1 rounded hover:bg-white/10 transition-colors"
              onMouseDown={handleDragStart}
            >
              <GripHorizontal size={14} className="text-slate-500" />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[#522CEC] text-xs font-bold">//</span>
              <span className="text-xs font-bold tracking-wide text-white">EDIT IMAGE</span>
            </div>

            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {isLoading ? 'PROCESSING...' : image.name.slice(0, 20)}
            </span>
          </div>
        </div>

        {/* Input Field */}
        <div className="relative group">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="
              w-full bg-transparent text-white text-sm p-4 pr-14 h-20
              resize-none outline-none placeholder-slate-400
              focus:bg-white/[0.02] transition-colors
            "
            placeholder="Describe what to change... (e.g., 'make background blue', 'add warm lighting')"
            disabled={isLoading}
            autoFocus
          />

          {/* Error message */}
          {error && (
            <div className="absolute top-2 left-4 right-14 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              {error}
            </div>
          )}

          {/* Submit Button */}
          <button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            className="absolute bottom-3 right-3 p-2 bg-[#522CEC] hover:bg-[#4322c5] text-white rounded-lg shadow-lg shadow-indigo-500/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </button>
        </div>

        {/* Hint */}
        <div className="px-4 py-2 border-t border-white/5 bg-black/20">
          <p className="text-[10px] text-slate-500">
            Press <span className="text-slate-400">Enter</span> to submit, <span className="text-slate-400">Esc</span> to close
          </p>
        </div>
      </div>
    </div>
  )
}
