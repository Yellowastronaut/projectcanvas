import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Eye, Image as ImageIcon, ArrowRight, Ratio, GripHorizontal, Sparkles, Monitor, Loader2 } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ImageItem } from '../store/types'
import { submitAIModifier } from '../api/n8n'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { cn } from '@/lib/utils'

const MODELS = [
  { id: 'nano-banana-pro', name: 'NANO BANANA PRO' },
  { id: 'seedream-4.5', name: 'SEEDREAM 4.5' },
  { id: 'flux-2', name: 'FLUX 2' },
]

const PERSPECTIVES = [
  { id: 'frontal', name: 'Frontal' },
  { id: '45', name: '45°' },
  { id: 'top-down', name: 'Top-Down' },
  { id: 'low-angle', name: 'Low Angle' },
]

const RATIOS = [
  { id: '1:1', name: '1:1' },
  { id: '2:3', name: '2:3' },
  { id: '3:2', name: '3:2' },
  { id: '3:4', name: '3:4' },
  { id: '4:3', name: '4:3' },
  { id: '4:5', name: '4:5' },
  { id: '5:4', name: '5:4' },
  { id: '9:16', name: '9:16' },
  { id: '16:9', name: '16:9' },
  { id: '21:9', name: '21:9' },
]

const STYLES = [
  { id: 'clean', name: 'Clean' },
  { id: 'hero', name: 'Hero' },
  { id: 'lifestyle', name: 'Lifestyle' },
  { id: 'ingredient', name: 'Ingred.' },
  { id: 'in-use', name: 'In use' },
]

const RESOLUTIONS = [
  { id: '1k', name: '1K' },
  { id: '2k', name: '2K' },
  { id: '4k', name: '4K' },
]

interface _ToolSlotProps {
  icon: React.ReactNode
  label: string
  value?: string
  isActive?: boolean
  isDashed?: boolean
  onClick?: () => void
}

function _ToolSlot({ icon, label, value, isActive, onClick }: Omit<_ToolSlotProps, 'isDashed'>) {
  return (
    <button
      onClick={onClick}
      className={`
        flex flex-col items-start justify-center py-1.5 px-3 rounded-lg h-14 transition-all text-left border
        ${isActive
          ? 'bg-[#522CEC]/10 border-[#522CEC]/30'
          : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
        }
      `}
    >
      <div className="flex items-center gap-1.5 mb-0.5">
        <span className={`${isActive ? 'text-[#522CEC]' : 'text-slate-400'}`}>
          {icon}
        </span>
        <span className="text-[10px] font-bold uppercase text-slate-500">{label}</span>
      </div>
      <span className={`text-[10px] font-mono truncate w-full ${isActive ? 'text-white' : 'text-slate-300'}`}>
        {value || "--"}
      </span>
    </button>
  )
}
void _ToolSlot // Reserved for future use

interface ImageAIModifierProps {
  image: ImageItem
  scale: number
}

export function ImageAIModifier({ image, scale }: ImageAIModifierProps) {
  // Get all selected images from store - these will be the product images
  const { selectedImageIds, images: allImages } = useStore()
  const selectedImages = allImages.filter(img => selectedImageIds.includes(img.id))
  const [input, setInput] = useState('')
  const [selectedModel, setSelectedModel] = useState(MODELS[0])
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [selectedPerspective, setSelectedPerspective] = useState(PERSPECTIVES[0])
  const [isPerspectiveDropdownOpen, setIsPerspectiveDropdownOpen] = useState(false)
  const [selectedRatio, setSelectedRatio] = useState(RATIOS[8]) // Default 16:9
  const [isRatioDropdownOpen, setIsRatioDropdownOpen] = useState(false)
  const [selectedStyle, setSelectedStyle] = useState(STYLES[0]) // Default Clean
  const [isStyleDropdownOpen, setIsStyleDropdownOpen] = useState(false)
  const [selectedResolution, setSelectedResolution] = useState(RESOLUTIONS[1]) // Default 2K
  const [isResolutionDropdownOpen, setIsResolutionDropdownOpen] = useState(false)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [refImage, setRefImage] = useState<{ src: string; name: string } | null>(null)
  const [showCanvasImagePicker, setShowCanvasImagePicker] = useState(false)
  const [atCursorPosition, setAtCursorPosition] = useState<number | null>(null)
  const [pickerPosition, setPickerPosition] = useState({ x: 0, y: 0 })
  const dragRef = useRef({ startX: 0, startY: 0, posX: 0, posY: 0 })
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const textareaContainerRef = useRef<HTMLDivElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Update picker position when it opens
  useEffect(() => {
    if (showCanvasImagePicker && textareaContainerRef.current) {
      const rect = textareaContainerRef.current.getBoundingClientRect()
      setPickerPosition({
        x: rect.left + 16,
        y: rect.top - 8, // Position above the textarea
      })
    }
  }, [showCanvasImagePicker])

  const { addImage, updateImage, removeImage } = useStore()
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async () => {
    if (!input.trim() || isLoading) return
    setIsLoading(true)
    setError(null)

    // Calculate dimensions based on selected ratio
    const [ratioW, ratioH] = selectedRatio.id.split(':').map(Number)
    const aspectRatio = ratioW / ratioH
    let newWidth = image.width
    let newHeight = image.height

    // Adjust dimensions to match selected aspect ratio
    if (aspectRatio > 1) {
      // Wider than tall
      newHeight = Math.round(newWidth / aspectRatio)
    } else {
      // Taller than wide
      newWidth = Math.round(newHeight * aspectRatio)
    }

    // Create a placeholder image while generating
    const placeholderId = addImage({
      src: '', // Empty src - will show as generating
      x: image.x + image.width + 50,
      y: image.y,
      width: newWidth,
      height: newHeight,
      name: `${image.name}_modified`,
      isGenerating: true,
    })

    try {
      // Use all selected images as source images, fallback to single image if none selected
      const imagesToProcess = selectedImages.length > 0 ? selectedImages : [image]

      const result = await submitAIModifier({
        sourceImages: imagesToProcess.map(img => ({
          id: img.id,
          src: img.src,
          name: img.name,
        })),
        refImage: refImage ? {
          src: refImage.src,
          name: refImage.name,
        } : undefined,
        prompt: input,
        model: selectedModel.id,
        perspective: selectedPerspective.id,
        ratio: selectedRatio.id,
        style: selectedStyle.id,
        resolution: selectedResolution.id,
      })

      if (result.success && result.imageUrl) {
        // Update the placeholder with the real image and metadata
        updateImage(placeholderId, {
          src: result.imageUrl,
          isGenerating: false,
          metadata: result.metadata,
        })
        setInput('')
      } else {
        // Remove placeholder on error
        removeImage(placeholderId)
        setError(result.error || 'Failed to process image')
      }
    } catch (err) {
      // Remove placeholder on error
      removeImage(placeholderId)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Only prevent default for Enter (submit), allow all other keys including Space
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
    // Close @ picker on Escape
    if (e.key === 'Escape' && showCanvasImagePicker) {
      setShowCanvasImagePicker(false)
      setAtCursorPosition(null)
    }
    // Stop propagation so canvas doesn't capture the keypress
    e.stopPropagation()
  }

  // Handle input change and detect @ symbol
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value
    const cursorPos = e.target.selectionStart
    setInput(value)

    // Check if @ was just typed
    if (value[cursorPos - 1] === '@') {
      setShowCanvasImagePicker(true)
      setAtCursorPosition(cursorPos)
    } else if (showCanvasImagePicker) {
      // Close picker if user types something else after @
      const textAfterAt = value.slice(atCursorPosition || 0)
      if (textAfterAt.includes(' ') || textAfterAt.length > 30) {
        setShowCanvasImagePicker(false)
        setAtCursorPosition(null)
      }
    }
  }

  // Select canvas image as reference
  const selectCanvasImageAsRef = (canvasImage: ImageItem) => {
    setRefImage({ src: canvasImage.src, name: canvasImage.name })
    setShowCanvasImagePicker(false)
    // Remove the @ from input
    if (atCursorPosition !== null) {
      const newInput = input.slice(0, atCursorPosition - 1) + input.slice(atCursorPosition)
      setInput(newInput)
    }
    setAtCursorPosition(null)
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

  // Calculate menu width - 30% wider (520 -> 650)
  const menuWidth = Math.max(520, Math.min(650, image.width * 1.3))

  return (
    <div
      className={`absolute left-1/2 z-50 ${isDragging ? 'cursor-grabbing' : ''}`}
      style={{
        top: image.height + 70 / scale + position.y,
        left: `calc(50% + ${position.x}px)`,
        transform: `translateX(-50%) scale(${1 / scale})`,
        transformOrigin: 'top center',
        width: menuWidth,
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* CONSOLE CONTAINER - Deep Glass Effect (like context menu) */}
      <div className="
        relative z-50
        bg-[#1A1B25]/70 backdrop-blur-xl saturate-150
        border border-white/10 ring-1 ring-white/5
        rounded-2xl shadow-[0_20px_40px_-10px_rgba(0,0,0,0.5)]
        flex flex-col
        animate-in slide-in-from-bottom-2 duration-300
      ">

        {/* 1. STATUS BAR (Technical Header) with Drag Handle */}
        <div className="flex justify-between items-center px-4 py-2.5 border-b border-white/5 bg-transparent">
          {/* Left: Drag Handle + Mode Indicator */}
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
              <span className="text-xs font-bold tracking-wide text-white">AI MODIFIER</span>
            </div>

            <span className="text-[10px] text-slate-400 uppercase tracking-wider">
              {isLoading ? 'PROCESSING...' : selectedImages.length > 1
                ? `${selectedImages.length} IMAGES SELECTED`
                : `EDITING: ${image.name.slice(0, 20)}`}
            </span>
          </div>

          {/* Right: Model Chip (Interactive) */}
          <div className="relative">
            <button
              onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
              className="flex items-center gap-2 px-2 py-0.5 rounded bg-black/40 border border-white/10 hover:border-primary transition-all group"
            >
              <span className={cn(
                "w-1.5 h-1.5 rounded-full group-hover:shadow-[0_0_8px_rgba(52,211,153,0.8)] transition-shadow",
                isLoading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'
              )}></span>
              <span className="text-[10px] font-mono text-slate-300 group-hover:text-white">
                {selectedModel.name}
              </span>
            </button>

            {/* Model Dropdown */}
            {isModelDropdownOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsModelDropdownOpen(false)} />
                <div className="absolute top-full right-0 mt-1 bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[180px]">
                  {MODELS.map((model) => (
                    <button
                      key={model.id}
                      onClick={() => {
                        setSelectedModel(model)
                        setIsModelDropdownOpen(false)
                      }}
                      className={cn(
                        "w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide transition-colors",
                        selectedModel.id === model.id
                          ? 'bg-primary/20 text-primary font-bold'
                          : 'text-slate-400 hover:bg-white/5 hover:text-white'
                      )}
                    >
                      {model.name}
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* 2. INPUT FIELD (Terminal Style) */}
        <div ref={textareaContainerRef} className="relative group">
          <Textarea
            ref={inputRef}
            value={input}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            className="w-full bg-transparent text-white text-sm p-4 pr-14 h-28 resize-none border-none shadow-none focus-visible:ring-0 placeholder-slate-400 focus:bg-white/[0.02] transition-colors"
            placeholder="Add dramatic lighting, change background to mars..."
            disabled={isLoading}
            style={{ color: 'white' }}
          />

          {/* Error message */}
          {error && (
            <div className="absolute top-2 left-4 right-14 text-[10px] text-red-400 bg-red-500/10 border border-red-500/20 rounded px-2 py-1">
              {error}
            </div>
          )}

          {/* Action Button (Floating bottom right of text area) */}
          <Button
            onClick={handleSubmit}
            disabled={!input.trim() || isLoading}
            size="icon"
            className="absolute bottom-3 right-3 p-2 bg-primary hover:bg-primary/90 text-white rounded-lg shadow-lg shadow-primary/20 transition-all hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100"
          >
            {isLoading ? <Loader2 size={18} className="animate-spin" /> : <ArrowRight size={18} />}
          </Button>

          {/* Canvas Image Picker (@ mention dropdown) - rendered as portal */}
          {showCanvasImagePicker && allImages.length > 0 && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => {
                setShowCanvasImagePicker(false)
                setAtCursorPosition(null)
              }} />
              <div
                className="fixed bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl z-[9999] min-w-[200px] max-w-[300px] max-h-[200px] overflow-y-auto"
                style={{
                  left: pickerPosition.x,
                  top: pickerPosition.y,
                  transform: 'translateY(-100%)',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#522CEC30 transparent',
                }}
                onWheel={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-2 border-b border-white/10 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Canvas Images
                </div>
                {allImages.map((canvasImg) => (
                  <button
                    key={canvasImg.id}
                    onClick={() => selectCanvasImageAsRef(canvasImg)}
                    className="w-full flex items-center gap-3 px-3 py-2 hover:bg-white/5 transition-colors text-left"
                  >
                    <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border border-white/10">
                      <img src={canvasImg.src} alt={canvasImg.name} className="w-full h-full object-cover" />
                    </div>
                    <span className="text-[11px] font-mono text-slate-300 truncate">
                      {canvasImg.name}
                    </span>
                  </button>
                ))}
              </div>
            </>,
            document.body
          )}

          {/* Show hint when no canvas images */}
          {showCanvasImagePicker && allImages.length === 0 && createPortal(
            <>
              <div className="fixed inset-0 z-[9998]" onClick={() => {
                setShowCanvasImagePicker(false)
                setAtCursorPosition(null)
              }} />
              <div
                className="fixed bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl z-[9999] min-w-[200px] p-3"
                style={{
                  left: pickerPosition.x,
                  top: pickerPosition.y,
                  transform: 'translateY(-100%)',
                }}
              >
                <span className="text-[11px] text-slate-400">
                  No images on canvas. Upload images first.
                </span>
              </div>
            </>,
            document.body
          )}
        </div>

        {/* 3. PARAMETER DECK (The Control Grid) */}
        <div className="p-2 bg-black/20 border-t border-white/5">
          <div className="grid grid-cols-5 gap-1">

            {/* A. Ref Image (Special styling) */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className={cn(
                "flex flex-col items-start justify-center py-1.5 px-3 rounded-lg transition-all text-left relative overflow-hidden h-14",
                refImage
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-white/5 hover:bg-white/10 border border-dashed border-slate-600 hover:border-slate-400'
              )}
            >
              {refImage ? (
                <>
                  {/* Thumbnail */}
                  <div className="absolute inset-0 flex items-center gap-2 p-1.5">
                    <div className="relative w-10 h-10 rounded overflow-hidden flex-shrink-0 border border-white/20">
                      <img src={refImage.src} alt="Reference" className="w-full h-full object-cover" />
                      {/* Remove button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          setRefImage(null)
                        }}
                        className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-[8px] font-bold"
                      >
                        ×
                      </button>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="text-[10px] font-bold text-primary block">REF</span>
                      <span className="text-[9px] font-mono text-slate-300 truncate block">
                        {refImage.name.length > 10 ? refImage.name.slice(0, 10) + '...' : refImage.name}
                      </span>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5 text-slate-400 mb-0.5">
                    <ImageIcon size={14} />
                    <span className="text-[10px] font-bold text-slate-500">REF</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">
                    Drop Img
                  </span>
                </>
              )}
            </button>

            {/* B. Perspective Slot with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsPerspectiveDropdownOpen(!isPerspectiveDropdownOpen)}
                className={cn(
                  "w-full flex flex-col items-start justify-center py-1.5 px-3 rounded-lg h-14 transition-all text-left border",
                  isPerspectiveDropdownOpen
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={isPerspectiveDropdownOpen ? 'text-primary' : 'text-slate-400'}>
                    <Eye size={14} />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">PERSPECTIVE</span>
                </div>
                <span className={cn("text-[10px] font-mono truncate w-full", isPerspectiveDropdownOpen ? 'text-white' : 'text-slate-300')}>
                  {selectedPerspective.name}
                </span>
              </button>

              {/* Perspective Dropdown */}
              {isPerspectiveDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsPerspectiveDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[140px]">
                    {PERSPECTIVES.map((perspective) => (
                      <button
                        key={perspective.id}
                        onClick={() => {
                          setSelectedPerspective(perspective)
                          setIsPerspectiveDropdownOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide transition-colors",
                          selectedPerspective.id === perspective.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {perspective.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* C. Aspect Ratio with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsRatioDropdownOpen(!isRatioDropdownOpen)}
                className={cn(
                  "w-full flex flex-col items-start justify-center py-1.5 px-3 rounded-lg h-14 transition-all text-left border",
                  isRatioDropdownOpen
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={isRatioDropdownOpen ? 'text-primary' : 'text-slate-400'}>
                    <Ratio size={14} />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">RATIO</span>
                </div>
                <span className={cn("text-[10px] font-mono truncate w-full", isRatioDropdownOpen ? 'text-white' : 'text-slate-300')}>
                  {selectedRatio.name}
                </span>
              </button>

              {/* Ratio Dropdown */}
              {isRatioDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsRatioDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[100px]">
                    {RATIOS.map((ratio) => (
                      <button
                        key={ratio.id}
                        onClick={() => {
                          setSelectedRatio(ratio)
                          setIsRatioDropdownOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide transition-colors",
                          selectedRatio.id === ratio.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {ratio.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* C. Style with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsStyleDropdownOpen(!isStyleDropdownOpen)}
                className={cn(
                  "w-full flex flex-col items-start justify-center py-1.5 px-3 rounded-lg h-14 transition-all text-left border",
                  isStyleDropdownOpen
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={isStyleDropdownOpen ? 'text-primary' : 'text-slate-400'}>
                    <Sparkles size={14} />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">STYLING</span>
                </div>
                <span className={cn("text-[10px] font-mono truncate w-full", isStyleDropdownOpen ? 'text-white' : 'text-slate-300')}>
                  {selectedStyle.name}
                </span>
              </button>

              {/* Style Dropdown */}
              {isStyleDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsStyleDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[120px]">
                    {STYLES.map((style) => (
                      <button
                        key={style.id}
                        onClick={() => {
                          setSelectedStyle(style)
                          setIsStyleDropdownOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide transition-colors",
                          selectedStyle.id === style.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {style.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* E. Resolution with Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsResolutionDropdownOpen(!isResolutionDropdownOpen)}
                className={cn(
                  "w-full flex flex-col items-start justify-center py-1.5 px-3 rounded-lg h-14 transition-all text-left border",
                  isResolutionDropdownOpen
                    ? 'bg-primary/10 border-primary/30'
                    : 'bg-white/5 border-transparent hover:bg-white/10 hover:border-white/10'
                )}
              >
                <div className="flex items-center gap-1.5 mb-0.5">
                  <span className={isResolutionDropdownOpen ? 'text-primary' : 'text-slate-400'}>
                    <Monitor size={14} />
                  </span>
                  <span className="text-[10px] font-bold uppercase text-slate-500">RES</span>
                </div>
                <span className={cn("text-[10px] font-mono truncate w-full", isResolutionDropdownOpen ? 'text-white' : 'text-slate-300')}>
                  {selectedResolution.name}
                </span>
              </button>

              {/* Resolution Dropdown */}
              {isResolutionDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsResolutionDropdownOpen(false)} />
                  <div className="absolute bottom-full left-0 mb-1 bg-[#1A1B25] border border-white/10 rounded-lg shadow-xl py-1 z-50 min-w-[80px]">
                    {RESOLUTIONS.map((resolution) => (
                      <button
                        key={resolution.id}
                        onClick={() => {
                          setSelectedResolution(resolution)
                          setIsResolutionDropdownOpen(false)
                        }}
                        className={cn(
                          "w-full text-left px-3 py-2 text-[11px] font-mono tracking-wide transition-colors",
                          selectedResolution.id === resolution.id
                            ? 'bg-primary/20 text-primary font-bold'
                            : 'text-slate-400 hover:bg-white/5 hover:text-white'
                        )}
                      >
                        {resolution.name}
                      </button>
                    ))}
                  </div>
                </>
              )}
            </div>

          </div>
        </div>

        {/* Hidden file input for reference images */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (!file) return

            const reader = new FileReader()
            reader.onload = (event) => {
              const src = event.target?.result as string
              // Store as reference image, NOT on canvas
              setRefImage({ src, name: file.name })
            }
            reader.readAsDataURL(file)
            e.target.value = ''
          }}
        />

      </div>
    </div>
  )
}
