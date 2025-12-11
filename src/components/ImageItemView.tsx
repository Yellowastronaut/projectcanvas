import { useState, useRef, useCallback } from 'react'
import { Info, Copy, Check } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { ImageItem, SnapGuide } from '../store/types'
import { ImageActionButtons } from './ImageActionButtons'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
// TODO: Re-enable when edit feature is ready
// import { ImageEditPanel } from './ImageEditPanel'

interface Props {
  image: ImageItem
  gridSize: number
}

export function ImageItemView({ image, gridSize }: Props) {
  const { selectedImageId, selectedImageIds, selectImage, toggleImageSelection, updateImage, transform, images, setSnapGuides } = useStore()
  const isSelected = selectedImageIds.includes(image.id)
  const isPrimarySelection = selectedImageId === image.id

  const [isDragging, setIsDragging] = useState(false)
  const [_isResizing, setIsResizing] = useState(false)
  const [showMetadata, setShowMetadata] = useState(false)
  const [copiedPrompt, setCopiedPrompt] = useState(false)
  // TODO: Re-enable when edit feature is ready
  // const [showEditPanel, setShowEditPanel] = useState(false)
  const infoButtonRef = useRef<HTMLButtonElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, imageX: 0, imageY: 0 })
  const resizeRef = useRef({ startX: 0, startY: 0, startWidth: 0, startHeight: 0, aspectRatio: 1 })

  // Calculate gaps between existing images
  const getExistingGaps = useCallback(() => {
    const otherImages = images.filter((img) => img.id !== image.id)
    const horizontalGaps: number[] = []
    const verticalGaps: number[] = []

    for (let i = 0; i < otherImages.length; i++) {
      for (let j = i + 1; j < otherImages.length; j++) {
        const a = otherImages[i]
        const b = otherImages[j]

        // Horizontal gap (images side by side)
        if (a.x + a.width < b.x) {
          horizontalGaps.push(b.x - (a.x + a.width))
        } else if (b.x + b.width < a.x) {
          horizontalGaps.push(a.x - (b.x + b.width))
        }

        // Vertical gap (images stacked)
        if (a.y + a.height < b.y) {
          verticalGaps.push(b.y - (a.y + a.height))
        } else if (b.y + b.height < a.y) {
          verticalGaps.push(a.y - (b.y + b.height))
        }
      }
    }

    return { horizontalGaps, verticalGaps }
  }, [images, image.id])

  // Snap position to grid and other images
  const snapPosition = useCallback(
    (x: number, y: number, width: number, height: number) => {
      let snappedX = Math.round(x / gridSize) * gridSize
      let snappedY = Math.round(y / gridSize) * gridSize
      const guides: SnapGuide[] = []

      // Snap to other images (align edges)
      const snapThreshold = 10
      const otherImages = images.filter((img) => img.id !== image.id)

      // Get existing gaps for equal spacing snapping
      const { horizontalGaps, verticalGaps } = getExistingGaps()

      for (const other of otherImages) {
        // Calculate centers
        const draggedCenterX = snappedX + width / 2
        const draggedCenterY = snappedY + height / 2
        const otherCenterX = other.x + other.width / 2
        const otherCenterY = other.y + other.height / 2

        // CENTER TO CENTER - Horizontal (vertical center line)
        if (Math.abs(draggedCenterX - otherCenterX) < snapThreshold) {
          snappedX = otherCenterX - width / 2
          guides.push({
            type: 'vertical',
            position: otherCenterX,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }

        // CENTER TO CENTER - Vertical (horizontal center line)
        if (Math.abs(draggedCenterY - otherCenterY) < snapThreshold) {
          snappedY = otherCenterY - height / 2
          guides.push({
            type: 'horizontal',
            position: otherCenterY,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }

        // Left edge to left edge
        if (Math.abs(snappedX - other.x) < snapThreshold) {
          snappedX = other.x
          guides.push({
            type: 'vertical',
            position: other.x,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }
        // Left edge to right edge
        if (Math.abs(snappedX - (other.x + other.width)) < snapThreshold) {
          snappedX = other.x + other.width
          guides.push({
            type: 'vertical',
            position: other.x + other.width,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }
        // Left edge to center
        if (Math.abs(snappedX - otherCenterX) < snapThreshold) {
          snappedX = otherCenterX
          guides.push({
            type: 'vertical',
            position: otherCenterX,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }
        // Right edge to left edge
        if (Math.abs(snappedX + width - other.x) < snapThreshold) {
          snappedX = other.x - width
          guides.push({
            type: 'vertical',
            position: other.x,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }
        // Right edge to right edge
        if (Math.abs(snappedX + width - (other.x + other.width)) < snapThreshold) {
          snappedX = other.x + other.width - width
          guides.push({
            type: 'vertical',
            position: other.x + other.width,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }
        // Right edge to center
        if (Math.abs(snappedX + width - otherCenterX) < snapThreshold) {
          snappedX = otherCenterX - width
          guides.push({
            type: 'vertical',
            position: otherCenterX,
            start: Math.min(snappedY, other.y),
            end: Math.max(snappedY + height, other.y + other.height),
          })
        }

        // Top edge to top edge
        if (Math.abs(snappedY - other.y) < snapThreshold) {
          snappedY = other.y
          guides.push({
            type: 'horizontal',
            position: other.y,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }
        // Top edge to bottom edge
        if (Math.abs(snappedY - (other.y + other.height)) < snapThreshold) {
          snappedY = other.y + other.height
          guides.push({
            type: 'horizontal',
            position: other.y + other.height,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }
        // Top edge to center
        if (Math.abs(snappedY - otherCenterY) < snapThreshold) {
          snappedY = otherCenterY
          guides.push({
            type: 'horizontal',
            position: otherCenterY,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }
        // Bottom edge to top edge
        if (Math.abs(snappedY + height - other.y) < snapThreshold) {
          snappedY = other.y - height
          guides.push({
            type: 'horizontal',
            position: other.y,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }
        // Bottom edge to bottom edge
        if (Math.abs(snappedY + height - (other.y + other.height)) < snapThreshold) {
          snappedY = other.y + other.height - height
          guides.push({
            type: 'horizontal',
            position: other.y + other.height,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }
        // Bottom edge to center
        if (Math.abs(snappedY + height - otherCenterY) < snapThreshold) {
          snappedY = otherCenterY - height
          guides.push({
            type: 'horizontal',
            position: otherCenterY,
            start: Math.min(snappedX, other.x),
            end: Math.max(snappedX + width, other.x + other.width),
          })
        }

        // Equal spacing snapping (horizontal)
        // Check if dragged image is to the right of other image
        const currentHGap = snappedX - (other.x + other.width)
        if (currentHGap > 0) {
          for (const gap of horizontalGaps) {
            if (Math.abs(currentHGap - gap) < snapThreshold) {
              snappedX = other.x + other.width + gap
              // Calculate overlapping vertical range
              const overlapTop = Math.max(snappedY, other.y)
              const overlapBottom = Math.min(snappedY + height, other.y + other.height)
              guides.push({
                type: 'spacing',
                position: other.x + other.width + gap / 2,
                start: overlapTop,
                end: overlapBottom,
                gap,
                direction: 'horizontal',
              })
              break
            }
          }
        }
        // Check if dragged image is to the left of other image
        const currentHGapLeft = other.x - (snappedX + width)
        if (currentHGapLeft > 0) {
          for (const gap of horizontalGaps) {
            if (Math.abs(currentHGapLeft - gap) < snapThreshold) {
              snappedX = other.x - width - gap
              // Calculate overlapping vertical range
              const overlapTop = Math.max(snappedY, other.y)
              const overlapBottom = Math.min(snappedY + height, other.y + other.height)
              guides.push({
                type: 'spacing',
                position: other.x - gap / 2,
                start: overlapTop,
                end: overlapBottom,
                gap,
                direction: 'horizontal',
              })
              break
            }
          }
        }

        // Equal spacing snapping (vertical)
        // Check if dragged image is below other image
        const currentVGap = snappedY - (other.y + other.height)
        if (currentVGap > 0) {
          for (const gap of verticalGaps) {
            if (Math.abs(currentVGap - gap) < snapThreshold) {
              snappedY = other.y + other.height + gap
              // Calculate overlapping horizontal range
              const overlapLeft = Math.max(snappedX, other.x)
              const overlapRight = Math.min(snappedX + width, other.x + other.width)
              guides.push({
                type: 'spacing',
                position: other.y + other.height + gap / 2,
                start: overlapLeft,
                end: overlapRight,
                gap,
                direction: 'vertical',
              })
              break
            }
          }
        }
        // Check if dragged image is above other image
        const currentVGapTop = other.y - (snappedY + height)
        if (currentVGapTop > 0) {
          for (const gap of verticalGaps) {
            if (Math.abs(currentVGapTop - gap) < snapThreshold) {
              snappedY = other.y - height - gap
              // Calculate overlapping horizontal range
              const overlapLeft = Math.max(snappedX, other.x)
              const overlapRight = Math.min(snappedX + width, other.x + other.width)
              guides.push({
                type: 'spacing',
                position: other.y - gap / 2,
                start: overlapLeft,
                end: overlapRight,
                gap,
                direction: 'vertical',
              })
              break
            }
          }
        }
      }

      return { x: snappedX, y: snappedY, guides }
    },
    [gridSize, images, image.id, getExistingGaps]
  )

  // Snap resize to other images (right and bottom edges)
  const snapResize = useCallback(
    (width: number, height: number, aspectRatio: number) => {
      let snappedWidth = width
      let snappedHeight = height
      const guides: SnapGuide[] = []
      const snapThreshold = 10
      const otherImages = images.filter((img) => img.id !== image.id)

      const rightEdge = image.x + width
      const bottomEdge = image.y + height

      for (const other of otherImages) {
        // Right edge to left edge
        if (Math.abs(rightEdge - other.x) < snapThreshold) {
          snappedWidth = other.x - image.x
          snappedHeight = snappedWidth / aspectRatio
          guides.push({
            type: 'vertical',
            position: other.x,
            start: Math.min(image.y, other.y),
            end: Math.max(image.y + snappedHeight, other.y + other.height),
          })
        }
        // Right edge to right edge
        if (Math.abs(rightEdge - (other.x + other.width)) < snapThreshold) {
          snappedWidth = other.x + other.width - image.x
          snappedHeight = snappedWidth / aspectRatio
          guides.push({
            type: 'vertical',
            position: other.x + other.width,
            start: Math.min(image.y, other.y),
            end: Math.max(image.y + snappedHeight, other.y + other.height),
          })
        }
        // Bottom edge to top edge
        if (Math.abs(bottomEdge - other.y) < snapThreshold) {
          snappedHeight = other.y - image.y
          snappedWidth = snappedHeight * aspectRatio
          guides.push({
            type: 'horizontal',
            position: other.y,
            start: Math.min(image.x, other.x),
            end: Math.max(image.x + snappedWidth, other.x + other.width),
          })
        }
        // Bottom edge to bottom edge
        if (Math.abs(bottomEdge - (other.y + other.height)) < snapThreshold) {
          snappedHeight = other.y + other.height - image.y
          snappedWidth = snappedHeight * aspectRatio
          guides.push({
            type: 'horizontal',
            position: other.y + other.height,
            start: Math.min(image.x, other.x),
            end: Math.max(image.x + snappedWidth, other.x + other.width),
          })
        }
      }

      return { width: snappedWidth, height: snappedHeight, guides }
    },
    [images, image.id, image.x, image.y]
  )

  // Handle drag start
  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return
    e.stopPropagation()

    // Shift+click for multi-select toggle
    if (e.shiftKey) {
      toggleImageSelection(image.id)
      return
    }

    // Regular click selects only this image (unless already part of multi-selection)
    if (!isSelected) {
      selectImage(image.id)
    }

    if ((e.target as HTMLElement).classList.contains('resize-handle')) {
      setIsResizing(true)
      resizeRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        startWidth: image.width,
        startHeight: image.height,
        aspectRatio: image.width / image.height,
      }
    } else {
      setIsDragging(true)
      dragRef.current = {
        startX: e.clientX,
        startY: e.clientY,
        imageX: image.x,
        imageY: image.y,
      }
    }

    // Store initial positions and sizes of all selected images for group operations
    const initialStates = new Map<string, { x: number; y: number; width: number; height: number }>()
    if (selectedImageIds.length > 1 && isSelected) {
      images.forEach((img) => {
        if (selectedImageIds.includes(img.id)) {
          initialStates.set(img.id, { x: img.x, y: img.y, width: img.width, height: img.height })
        }
      })
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (isDragging || (e.target as HTMLElement).classList.contains('resize-handle') === false) {
        const deltaX = (moveEvent.clientX - dragRef.current.startX) / transform.scale
        const deltaY = (moveEvent.clientY - dragRef.current.startY) / transform.scale

        // If multiple images are selected, move all of them
        if (selectedImageIds.length > 1 && isSelected) {
          initialStates.forEach((state, id) => {
            updateImage(id, { x: state.x + deltaX, y: state.y + deltaY })
          })
          setSnapGuides([])
        } else {
          // Single image movement with snapping
          const newX = dragRef.current.imageX + deltaX
          const newY = dragRef.current.imageY + deltaY

          const snapped = snapPosition(newX, newY, image.width, image.height)
          updateImage(image.id, { x: snapped.x, y: snapped.y })
          setSnapGuides(snapped.guides)
        }
      } else {
        const deltaX = (moveEvent.clientX - resizeRef.current.startX) / transform.scale
        const deltaY = (moveEvent.clientY - resizeRef.current.startY) / transform.scale

        // Use the larger delta to maintain aspect ratio
        const delta = Math.abs(deltaX) > Math.abs(deltaY) ? deltaX : deltaY * resizeRef.current.aspectRatio
        const rawWidth = Math.max(50, resizeRef.current.startWidth + delta)
        const rawHeight = rawWidth / resizeRef.current.aspectRatio

        // If multiple images are selected, scale all of them proportionally
        if (selectedImageIds.length > 1 && isSelected) {
          const scaleFactor = rawWidth / resizeRef.current.startWidth
          initialStates.forEach((state, id) => {
            updateImage(id, {
              width: state.width * scaleFactor,
              height: state.height * scaleFactor,
            })
          })
          setSnapGuides([])
        } else {
          // Snap resize to other images
          const snapped = snapResize(rawWidth, rawHeight, resizeRef.current.aspectRatio)
          updateImage(image.id, { width: snapped.width, height: snapped.height })
          setSnapGuides(snapped.guides)
        }
      }
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      setIsResizing(false)
      setSnapGuides([])
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <div
      className={`absolute select-none group transition-all duration-300 ease-out ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${!isSelected ? 'hover:scale-[1.01]' : ''}`}
      style={{
        left: image.x,
        top: image.y,
        width: image.width,
        height: image.height,
      }}
      data-image-id={image.id}
      onMouseDown={handleMouseDown}
    >
      {/* Gradient Border Container for Selected State */}
      <div
        className="relative w-full h-full overflow-hidden"
        style={{
          padding: isSelected ? 2 / transform.scale : 0,
          borderRadius: 12 / transform.scale,
        }}
      >
        {/* Gradient Border Background */}
        {isSelected && (
          <div
            className="absolute inset-0 bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-500 animate-gradient-glow"
            style={{
              borderRadius: 12 / transform.scale,
            }}
          />
        )}

        {/* Image Container */}
        <div
          className="relative w-full h-full"
          style={{
            borderRadius: isSelected ? 10 / transform.scale : 12 / transform.scale,
            overflow: 'hidden',
          }}
        >
          {image.isGenerating ? (
            // Generating placeholder - same style as transparent images
            <div
              className="w-full h-full relative overflow-hidden"
              style={{
                borderRadius: isSelected ? 10 / transform.scale : 12 / transform.scale,
              }}
            >
              {/* Animated pulsing gradient - same as transparent images */}
              <div className="absolute inset-0 bg-gradient-to-br from-[#522CEC]/20 via-[#522CEC]/10 to-[#522CEC]/20 animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#522CEC]/15 to-transparent animate-pulse" style={{ animationDelay: '0.5s' }} />
            </div>
          ) : (
            <img
              src={image.src}
              alt={image.name}
              className={`w-full h-full object-cover transition-all duration-300 ${
                isSelected
                  ? 'shadow-[0_10px_40px_-10px_rgba(82,44,236,0.5)]'
                  : 'group-hover:shadow-[0_10px_40px_-10px_rgba(82,44,236,0.3)]'
              }`}
              style={{
                borderRadius: isSelected ? 10 / transform.scale : 12 / transform.scale,
              }}
              draggable={false}
            />
          )}
        </div>
      </div>

      {/* Hover border overlay */}
      {!isSelected && (
        <div
          className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          style={{
            borderRadius: 12 / transform.scale,
            border: `${2 / transform.scale}px solid #522CEC`,
          }}
        />
      )}

      {/* Tech label - shows on selection */}
      {isSelected && (
        <div
          className="absolute left-0 text-slate-400 font-mono whitespace-nowrap"
          style={{
            bottom: -16 / transform.scale,
            fontSize: 8 / transform.scale,
          }}
        >
          {image.name} · {Math.round(image.width)}×{Math.round(image.height)}
        </div>
      )}

      {/* Info icon with metadata popover - shows on generated images */}
      {image.metadata && (
        <Popover open={showMetadata} onOpenChange={setShowMetadata}>
          <PopoverTrigger asChild>
            <button
              ref={infoButtonRef}
              onClick={(e) => e.stopPropagation()}
              className="absolute flex items-center justify-center bg-[#522CEC] hover:bg-[#4322c5] text-white rounded-full shadow-lg transition-all hover:scale-110 z-10"
              style={{
                top: 8 / transform.scale,
                right: 8 / transform.scale,
                width: 24 / transform.scale,
                height: 24 / transform.scale,
              }}
            >
              <Info style={{ width: 14 / transform.scale, height: 14 / transform.scale }} />
            </button>
          </PopoverTrigger>
          <PopoverContent
            side="right"
            align="start"
            sideOffset={12}
            className="w-[280px] p-0 bg-[#1A1B25]/95 backdrop-blur-xl saturate-150 border-white/10 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="border-b border-white/10 bg-[#522CEC]/10 px-4 py-3">
              <div className="flex items-center gap-2">
                <Info size={14} className="text-[#522CEC]" />
                <span className="text-xs font-bold text-white tracking-wide">
                  GENERATION INFO
                </span>
              </div>
            </div>

            {/* Content */}
            <div className="p-4">
              {/* Prompt */}
              {image.metadata.prompt && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Prompt
                    </span>
                    <button
                      onClick={async (e) => {
                        e.stopPropagation()
                        await navigator.clipboard.writeText(image.metadata!.prompt!)
                        setCopiedPrompt(true)
                        setTimeout(() => setCopiedPrompt(false), 2000)
                      }}
                      className="flex items-center gap-1 px-2 py-0.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                      {copiedPrompt ? (
                        <>
                          <Check size={10} className="text-emerald-400" />
                          <span className="text-[9px] text-emerald-400">Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy size={10} />
                          <span className="text-[9px]">Copy</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="text-[11px] text-slate-300 leading-relaxed bg-black/20 rounded-lg p-2 max-h-[200px] overflow-y-auto">
                    {image.metadata.prompt}
                  </div>
                </div>
              )}

              {/* Grid of other metadata */}
              <div className="grid grid-cols-2 gap-2">
                {image.metadata.model && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Model
                    </span>
                    <span className="text-[11px] text-white font-mono">
                      {image.metadata.model}
                    </span>
                  </div>
                )}
                {image.metadata.aspectRatio && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Aspect Ratio
                    </span>
                    <span className="text-[11px] text-white font-mono">
                      {image.metadata.aspectRatio}
                    </span>
                  </div>
                )}
                {image.metadata.resolution && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Resolution
                    </span>
                    <span className="text-[11px] text-white font-mono">
                      {image.metadata.resolution}
                    </span>
                  </div>
                )}
                {image.metadata.generationTime && (
                  <div className="bg-black/20 rounded-lg p-2">
                    <span className="text-[9px] font-bold text-slate-500 uppercase tracking-wider block mb-0.5">
                      Gen Time
                    </span>
                    <span className="text-[11px] text-white font-mono">
                      {image.metadata.generationTime.toFixed(1)}s
                    </span>
                  </div>
                )}
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}

      {/* Selection handles */}
      {isSelected && (
        <>
          {/* Corner handles - solid Electric Indigo circles */}
          <div
            className="absolute rounded-full"
            style={{
              top: -5 / transform.scale,
              left: -5 / transform.scale,
              width: 10 / transform.scale,
              height: 10 / transform.scale,
              backgroundColor: '#522CEC',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              top: -5 / transform.scale,
              right: -5 / transform.scale,
              width: 10 / transform.scale,
              height: 10 / transform.scale,
              backgroundColor: '#522CEC',
            }}
          />
          <div
            className="absolute rounded-full"
            style={{
              bottom: -5 / transform.scale,
              left: -5 / transform.scale,
              width: 10 / transform.scale,
              height: 10 / transform.scale,
              backgroundColor: '#522CEC',
            }}
          />
          <div
            className="resize-handle absolute rounded-full cursor-se-resize"
            style={{
              bottom: -5 / transform.scale,
              right: -5 / transform.scale,
              width: 10 / transform.scale,
              height: 10 / transform.scale,
              backgroundColor: '#522CEC',
            }}
          />

          {/* Action Buttons - only show on primary selection */}
          {isPrimarySelection && <ImageActionButtons image={image} scale={transform.scale} />}
        </>
      )}

      {/* TODO: Re-enable Edit Panel when feature is ready */}
      {/* {showEditPanel && image.metadata && (
        <ImageEditPanel
          image={image}
          scale={transform.scale}
          onClose={() => setShowEditPanel(false)}
        />
      )} */}
    </div>
  )
}
