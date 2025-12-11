import { useRef, useCallback, useEffect, useState } from 'react'
import { useStore } from '../store/useStore'
import { ImageItemView } from './ImageItemView'
import { TextItemView } from './TextItemView'
import { ZoomControls } from './ZoomControls'
import { SnapGuides } from './SnapGuides'
import { ContextMenu } from './ContextMenu'
import { CanvasContextMenu } from './CanvasContextMenu'
import { downloadImage } from '../api/n8n'

const GRID_SIZE = 8
const MIN_SCALE = 0.1
const MAX_SCALE = 5

interface MarqueeRect {
  startX: number
  startY: number
  currentX: number
  currentY: number
}

interface ContextMenuState {
  x: number
  y: number
  imageId?: string
  imageName?: string
}

interface CanvasMenuState {
  x: number
  y: number
}

export function CanvasView() {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isPanning, setIsPanning] = useState(false)
  const [panStart, setPanStart] = useState({ x: 0, y: 0 })
  const [isDragOver, setIsDragOver] = useState(false)
  const [isSpacePressed, setIsSpacePressed] = useState(false)
  const [marquee, setMarquee] = useState<MarqueeRect | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenuState | null>(null)
  const [canvasMenu, setCanvasMenu] = useState<CanvasMenuState | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { images, textItems, transform, setTransform, addImage, addText, selectImage, selectedImageId, selectedImageIds, selectMultipleImages, clearSelection, isAnimating, isChatOpen, removeImage } = useStore()

  // Calculate chat panel offset (w-96 = 384px + 16px margin + 16px padding)
  const chatPanelWidth = isChatOpen ? 416 : 0

  // Handle zoom via wheel
  const handleWheel = useCallback(
    (e: WheelEvent) => {
      e.preventDefault()
      const container = containerRef.current
      if (!container) return

      const rect = container.getBoundingClientRect()
      const mouseX = e.clientX - rect.left
      const mouseY = e.clientY - rect.top

      // Pinch zoom (trackpad) vs scroll zoom
      const delta = e.ctrlKey ? -e.deltaY / 100 : -e.deltaY / 500
      const newScale = Math.min(MAX_SCALE, Math.max(MIN_SCALE, transform.scale * (1 + delta)))

      // Zoom toward mouse position
      const scaleChange = newScale / transform.scale
      const newX = mouseX - (mouseX - transform.x) * scaleChange
      const newY = mouseY - (mouseY - transform.y) * scaleChange

      setTransform({ scale: newScale, x: newX, y: newY })
    },
    [transform, setTransform]
  )

  // Handle keyboard shortcuts
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      const isMeta = e.metaKey || e.ctrlKey

      // Only handle Space for canvas panning when not typing in an input
      const activeElement = document.activeElement
      const isTyping = activeElement instanceof HTMLInputElement ||
                       activeElement instanceof HTMLTextAreaElement ||
                       activeElement?.getAttribute('contenteditable') === 'true'

      if (e.code === 'Space' && !e.repeat && !isTyping) {
        e.preventDefault()
        setIsSpacePressed(true)
      } else if (isMeta && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        setTransform({ scale: Math.min(MAX_SCALE, transform.scale * 1.2) })
      } else if (isMeta && e.key === '-') {
        e.preventDefault()
        setTransform({ scale: Math.max(MIN_SCALE, transform.scale / 1.2) })
      } else if (isMeta && e.key === '0') {
        e.preventDefault()
        setTransform({ scale: 1, x: 0, y: 0 })
      } else if (e.key === 'Escape') {
        clearSelection()
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && !isTyping) {
        const store = useStore.getState()
        if (store.selectedImageIds.length > 0) {
          store.removeImages(store.selectedImageIds)
        }
      } else if ((e.key === 'f' || e.key === 'F') && !isTyping) {
        // Focus on selected image - center and fit to screen
        if (selectedImageId) {
          const selectedImage = images.find(img => img.id === selectedImageId)
          if (selectedImage) {
            const container = containerRef.current
            if (!container) return

            const rect = container.getBoundingClientRect()
            const viewportWidth = rect.width - chatPanelWidth
            const viewportHeight = rect.height

            const padding = 60
            const scaleX = (viewportWidth - padding * 2) / selectedImage.width
            const scaleY = (viewportHeight - padding * 2) / selectedImage.height
            const scale = Math.min(scaleX, scaleY, MAX_SCALE)

            const centerX = selectedImage.x + selectedImage.width / 2
            const centerY = selectedImage.y + selectedImage.height / 2
            const x = viewportWidth / 2 - centerX * scale
            const y = viewportHeight / 2 - centerY * scale

            setTransform({ scale, x, y }, true)
          }
        }
      }
    },
    [transform.scale, setTransform, clearSelection, selectedImageId, images, chatPanelWidth]
  )

  const handleKeyUp = useCallback((e: KeyboardEvent) => {
    if (e.code === 'Space') {
      setIsSpacePressed(false)
      setIsPanning(false)
    }
  }, [])

  // Set up event listeners
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    container.addEventListener('wheel', handleWheel, { passive: false })
    window.addEventListener('keydown', handleKeyDown)
    window.addEventListener('keyup', handleKeyUp)

    return () => {
      container.removeEventListener('wheel', handleWheel)
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleWheel, handleKeyDown, handleKeyUp])

  // Handle pan start
  const handleMouseDown = (e: React.MouseEvent) => {
    // Allow panning with: Space+Click, Middle mouse, Right click, or Cmd/Ctrl+Click
    const shouldPan =
      isSpacePressed ||
      e.button === 1 || // Middle mouse
      e.button === 2 || // Right click
      (e.button === 0 && (e.metaKey || e.ctrlKey))

    if (shouldPan) {
      setIsPanning(true)
      setPanStart({ x: e.clientX - transform.x, y: e.clientY - transform.y })
      e.preventDefault()
      return
    }

    // Click on empty canvas area - start marquee selection or deselect
    if (e.target === containerRef.current || (e.target as HTMLElement).classList.contains('canvas-area')) {
      if (e.button === 0) {
        // Start marquee selection
        const rect = containerRef.current?.getBoundingClientRect()
        if (rect) {
          setMarquee({
            startX: e.clientX - rect.left,
            startY: e.clientY - rect.top,
            currentX: e.clientX - rect.left,
            currentY: e.clientY - rect.top,
          })
          clearSelection()
        }
      }
    }
  }

  // Get images within marquee selection
  const getImagesInMarquee = useCallback(
    (marqueeRect: MarqueeRect) => {
      const container = containerRef.current
      if (!container) return []

      // Get marquee bounds in screen coordinates
      const left = Math.min(marqueeRect.startX, marqueeRect.currentX)
      const right = Math.max(marqueeRect.startX, marqueeRect.currentX)
      const top = Math.min(marqueeRect.startY, marqueeRect.currentY)
      const bottom = Math.max(marqueeRect.startY, marqueeRect.currentY)

      // Convert marquee to canvas coordinates
      const canvasLeft = (left - transform.x) / transform.scale
      const canvasRight = (right - transform.x) / transform.scale
      const canvasTop = (top - transform.y) / transform.scale
      const canvasBottom = (bottom - transform.y) / transform.scale

      // Find images that intersect with the marquee
      return images.filter((img) => {
        const imgRight = img.x + img.width
        const imgBottom = img.y + img.height

        // Check intersection
        return !(
          img.x > canvasRight ||
          imgRight < canvasLeft ||
          img.y > canvasBottom ||
          imgBottom < canvasTop
        )
      })
    },
    [images, transform]
  )

  // Handle context menu on right click
  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault()

    // Check if right-clicked on an image
    const target = e.target as HTMLElement
    const imageElement = target.closest('[data-image-id]')

    if (imageElement) {
      const imageId = imageElement.getAttribute('data-image-id')
      const image = images.find(img => img.id === imageId)

      if (image) {
        setCanvasMenu(null)
        setContextMenu({
          x: e.clientX,
          y: e.clientY,
          imageId: image.id,
          imageName: image.name,
        })
        selectImage(image.id)
      }
    } else {
      // Right-clicked on empty canvas
      setContextMenu(null)
      setCanvasMenu({
        x: e.clientX,
        y: e.clientY,
      })
    }
  }

  // Handle context menu actions
  const handleContextMenuAction = async (action: string) => {
    if (!contextMenu?.imageId) return

    const image = images.find(img => img.id === contextMenu.imageId)
    if (!image) return

    switch (action) {
      case 'open':
        // Focus on the image
        if (containerRef.current) {
          const rect = containerRef.current.getBoundingClientRect()
          const viewportWidth = rect.width - chatPanelWidth
          const viewportHeight = rect.height
          const padding = 60
          const scaleX = (viewportWidth - padding * 2) / image.width
          const scaleY = (viewportHeight - padding * 2) / image.height
          const scale = Math.min(scaleX, scaleY, MAX_SCALE)
          const centerX = image.x + image.width / 2
          const centerY = image.y + image.height / 2
          const x = viewportWidth / 2 - centerX * scale
          const y = viewportHeight / 2 - centerY * scale
          setTransform({ scale, x, y }, true)
        }
        break
      case 'remove-bg':
        // Trigger remove background via the ImageToolMenu logic
        try {
          const { transformImage } = await import('../api/n8n')
          const result = await transformImage('remove-bg', image.id, image.src)
          if (result.success && result.imageUrl) {
            useStore.getState().updateImage(image.id, { src: result.imageUrl })
          }
        } catch (error) {
          console.error('Failed to remove background:', error)
        }
        break
      case 'copy':
        // Copy image URL to clipboard
        navigator.clipboard.writeText(image.src)
        break
      case 'download':
        try {
          await downloadImage(image.src, image.name)
        } catch (error) {
          console.error('Failed to download:', error)
        }
        break
      case 'json':
        // Copy JSON representation to clipboard
        const jsonData = JSON.stringify({
          id: image.id,
          name: image.name,
          src: image.src,
          x: image.x,
          y: image.y,
          width: image.width,
          height: image.height,
        }, null, 2)
        navigator.clipboard.writeText(jsonData)
        break
      case 'delete':
        removeImage(image.id)
        break
    }

    setContextMenu(null)
  }

  // Handle canvas context menu actions
  const handleCanvasMenuAction = (action: string) => {
    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const viewportWidth = rect.width - chatPanelWidth
    const viewportHeight = rect.height

    switch (action) {
      case 'upload':
        fileInputRef.current?.click()
        break
      case 'fit-all':
        if (images.length > 0) {
          // Calculate bounds of all images
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          images.forEach(img => {
            minX = Math.min(minX, img.x)
            minY = Math.min(minY, img.y)
            maxX = Math.max(maxX, img.x + img.width)
            maxY = Math.max(maxY, img.y + img.height)
          })
          const boundsWidth = maxX - minX
          const boundsHeight = maxY - minY
          const padding = 60
          const scaleX = (viewportWidth - padding * 2) / boundsWidth
          const scaleY = (viewportHeight - padding * 2) / boundsHeight
          const scale = Math.min(scaleX, scaleY, MAX_SCALE)
          const centerX = minX + boundsWidth / 2
          const centerY = minY + boundsHeight / 2
          const x = viewportWidth / 2 - centerX * scale
          const y = viewportHeight / 2 - centerY * scale
          setTransform({ scale, x, y }, true)
        }
        break
      case 'reset-view':
        setTransform({ scale: 1, x: 0, y: 0 }, true)
        break
      case 'zoom-100':
        // If an image is selected, center it at 100% zoom
        if (selectedImageId) {
          const selectedImage = images.find(img => img.id === selectedImageId)
          if (selectedImage) {
            const centerX = selectedImage.x + selectedImage.width / 2
            const centerY = selectedImage.y + selectedImage.height / 2
            const x = viewportWidth / 2 - centerX
            const y = viewportHeight / 2 - centerY
            setTransform({ scale: 1, x, y }, true)
          }
        } else if (images.length > 0) {
          // No selection - center all images at 100%
          let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity
          images.forEach(img => {
            minX = Math.min(minX, img.x)
            minY = Math.min(minY, img.y)
            maxX = Math.max(maxX, img.x + img.width)
            maxY = Math.max(maxY, img.y + img.height)
          })
          const centerX = minX + (maxX - minX) / 2
          const centerY = minY + (maxY - minY) / 2
          const x = viewportWidth / 2 - centerX
          const y = viewportHeight / 2 - centerY
          setTransform({ scale: 1, x, y }, true)
        } else {
          setTransform({ scale: 1, x: 0, y: 0 }, true)
        }
        break
      case 'toggle-grid':
        // Grid is always visible for now - could add state later
        break
      case 'add-text':
        // Add text at center of viewport or at click position
        if (canvasMenu) {
          const canvasX = (canvasMenu.x - rect.left - transform.x) / transform.scale
          const canvasY = (canvasMenu.y - rect.top - transform.y) / transform.scale
          addText({
            text: 'Double-click to edit',
            x: Math.round(canvasX / GRID_SIZE) * GRID_SIZE,
            y: Math.round(canvasY / GRID_SIZE) * GRID_SIZE,
            fontSize: 48,
            fontFamily: 'Inter',
            fontWeight: 'bold',
            color: '#FFFFFF',
            rotation: 0,
          })
        }
        break
    }

    setCanvasMenu(null)
  }

  // Handle pan move and marquee
  const handleMouseMove = (e: React.MouseEvent) => {
    if (isPanning) {
      setTransform({
        x: e.clientX - panStart.x,
        y: e.clientY - panStart.y,
      })
    } else if (marquee) {
      const rect = containerRef.current?.getBoundingClientRect()
      if (rect) {
        const newMarquee = {
          ...marquee,
          currentX: e.clientX - rect.left,
          currentY: e.clientY - rect.top,
        }
        setMarquee(newMarquee)

        // Update selection in real-time
        const selectedImages = getImagesInMarquee(newMarquee)
        selectMultipleImages(selectedImages.map((img) => img.id))
      }
    }
  }

  // Handle pan end and marquee end
  const handleMouseUp = () => {
    setIsPanning(false)
    setMarquee(null)
  }

  // Handle file drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    const files = Array.from(e.dataTransfer.files).filter((file) =>
      file.type.startsWith('image/')
    )

    if (files.length === 0) return

    const container = containerRef.current
    if (!container) return

    const rect = container.getBoundingClientRect()
    const dropX = (e.clientX - rect.left - transform.x) / transform.scale
    const dropY = (e.clientY - rect.top - transform.y) / transform.scale

    files.forEach((file, index) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const src = event.target?.result as string
        const img = new Image()
        img.onload = () => {
          const maxSize = 1200
          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
          const width = img.width * ratio
          const height = img.height * ratio

          // For first image on empty canvas, center it in the viewport
          const isFirstImage = images.length === 0 && index === 0
          let imageX: number
          let imageY: number

          if (isFirstImage) {
            // Center in visible viewport
            const centerX = (rect.width / 2 - transform.x) / transform.scale
            const centerY = (rect.height / 2 - transform.y) / transform.scale
            imageX = Math.round((centerX - width / 2) / GRID_SIZE) * GRID_SIZE
            imageY = Math.round((centerY - height / 2) / GRID_SIZE) * GRID_SIZE
          } else {
            // Stagger multiple images diagonally so user can see all of them
            const staggerOffset = index * 40
            imageX = Math.round((dropX + staggerOffset) / GRID_SIZE) * GRID_SIZE
            imageY = Math.round((dropY + staggerOffset) / GRID_SIZE) * GRID_SIZE
          }

          addImage({
            src,
            x: imageX,
            y: imageY,
            width,
            height,
            name: file.name,
          })
        }
        img.src = src
      }
      reader.readAsDataURL(file)
    })
  }

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden canvas-grid ${
        isPanning ? 'cursor-grabbing' : isSpacePressed ? 'cursor-grab' : 'cursor-default'
      } ${isDragOver ? 'ring-2 ring-text ring-inset' : ''}`}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={handleContextMenu}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Transformed canvas content */}
      <div
        className="canvas-area absolute"
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          transformOrigin: '0 0',
          transition: isAnimating ? 'transform 0.4s cubic-bezier(0.4, 0, 0.2, 1)' : 'none',
        }}
      >
        {images.map((image) => (
          <ImageItemView key={image.id} image={image} gridSize={GRID_SIZE} />
        ))}
        {/* Text items */}
        {textItems.map((textItem) => (
          <TextItemView key={textItem.id} textItem={textItem} gridSize={GRID_SIZE} />
        ))}
        {/* Snap guides */}
        <SnapGuides />
      </div>

      {/* Drop hint */}
      {isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-[#1A1B25]/10 pointer-events-none">
          <div className="bg-[#1A1B25] text-white px-6 py-3 rounded-lg text-lg font-medium border-t border-white/10">
            Drop images here
          </div>
        </div>
      )}

      {/* Empty state - Cinematic Dropzone */}
      {images.length === 0 && !isDragOver && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-full max-w-2xl mx-auto p-12 text-center group cursor-pointer pointer-events-auto">

            {/* 1. Container: Dashed Border + Glow Effect */}
            <div className="absolute inset-0 border-2 border-dashed border-slate-200 rounded-3xl transition-all duration-300 group-hover:border-[#522CEC]/50 group-hover:bg-[#522CEC]/5"></div>

            {/* 2. Tech Corners (Kamera-Sucher-Optik) */}
            <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-slate-300 rounded-tl-3xl transition-colors group-hover:border-[#522CEC]"></div>
            <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-slate-300 rounded-tr-3xl transition-colors group-hover:border-[#522CEC]"></div>
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-slate-300 rounded-bl-3xl transition-colors group-hover:border-[#522CEC]"></div>
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-slate-300 rounded-br-3xl transition-colors group-hover:border-[#522CEC]"></div>

            {/* 3. Inhalt */}
            <div className="relative z-10 flex flex-col items-center justify-center space-y-6">

              {/* Icon: Freistehend mit Schatten */}
              <div className="p-4 bg-white rounded-2xl shadow-xl shadow-indigo-100/50 group-hover:scale-110 transition-transform duration-300">
                <svg className="w-10 h-10 text-[#522CEC]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </div>

              {/* Text */}
              <div className="space-y-2">
                <h3 className="text-2xl font-bold text-[#1A1B25]">
                  Start your creation
                </h3>
                <p className="text-slate-500 max-w-sm mx-auto">
                  Drag and drop your images here, or click to browse files.
                </p>
              </div>

              {/* Button: Secondary Style */}
              <label className="px-6 py-2.5 rounded-full border border-slate-200 text-[#1A1B25] font-medium hover:border-[#522CEC] hover:text-[#522CEC] transition-colors bg-white shadow-sm cursor-pointer">
                Select Files
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || [])
                    if (files.length === 0) return
                    const container = containerRef.current
                    if (!container) return
                    const rect = container.getBoundingClientRect()

                    files.forEach((file, index) => {
                      const reader = new FileReader()
                      reader.onload = (event) => {
                        const src = event.target?.result as string
                        const img = new Image()
                        img.onload = () => {
                          const maxSize = 1200
                          const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
                          const width = img.width * ratio
                          const height = img.height * ratio
                          const centerX = (rect.width / 2 - transform.x) / transform.scale
                          const centerY = (rect.height / 2 - transform.y) / transform.scale
                          const staggerOffset = index * 40
                          const imageX = Math.round((centerX - width / 2 + staggerOffset) / GRID_SIZE) * GRID_SIZE
                          const imageY = Math.round((centerY - height / 2 + staggerOffset) / GRID_SIZE) * GRID_SIZE
                          addImage({ src, x: imageX, y: imageY, width, height, name: file.name })
                        }
                        img.src = src
                      }
                      reader.readAsDataURL(file)
                    })
                    e.target.value = ''
                  }}
                />
              </label>

              {/* Tech Footer */}
              <div className="pt-4">
                <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-2 py-1 rounded tracking-wide">
                  SUPPORTS: JPG, PNG, WEBP // MAX 50MB
                </span>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* Logo */}
      <div className="absolute top-4 left-4 pointer-events-none">
        <img src="/logo.svg" alt="LUYA" className="h-10" />
      </div>

      {/* Marquee selection rectangle - limit to canvas area (not over chat) */}
      {marquee && (
        <div
          className="absolute border-2 border-[#522CEC] bg-[#522CEC]/10 pointer-events-none z-30"
          style={{
            left: Math.min(marquee.startX, marquee.currentX),
            top: Math.min(marquee.startY, marquee.currentY),
            width: Math.abs(marquee.currentX - marquee.startX),
            height: Math.abs(marquee.currentY - marquee.startY),
          }}
        />
      )}

      {/* Zoom controls */}
      <ZoomControls />

      {/* Context Menu for Images */}
      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          imageId={contextMenu.imageId}
          imageName={contextMenu.imageName}
          onClose={() => setContextMenu(null)}
          onAction={handleContextMenuAction}
        />
      )}

      {/* Context Menu for Canvas */}
      {canvasMenu && (
        <CanvasContextMenu
          x={canvasMenu.x}
          y={canvasMenu.y}
          onClose={() => setCanvasMenu(null)}
          onAction={handleCanvasMenuAction}
        />
      )}

      {/* Hidden file input for canvas menu upload */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files || [])
          if (files.length === 0) return
          const container = containerRef.current
          if (!container) return
          const rect = container.getBoundingClientRect()

          files.forEach((file, index) => {
            const reader = new FileReader()
            reader.onload = (event) => {
              const src = event.target?.result as string
              const img = new Image()
              img.onload = () => {
                const maxSize = 1200
                const ratio = Math.min(maxSize / img.width, maxSize / img.height, 1)
                const width = img.width * ratio
                const height = img.height * ratio
                const centerX = (rect.width / 2 - transform.x) / transform.scale
                const centerY = (rect.height / 2 - transform.y) / transform.scale
                const staggerOffset = index * 40
                const imageX = Math.round((centerX - width / 2 + staggerOffset) / GRID_SIZE) * GRID_SIZE
                const imageY = Math.round((centerY - height / 2 + staggerOffset) / GRID_SIZE) * GRID_SIZE
                addImage({ src, x: imageX, y: imageY, width, height, name: file.name })
              }
              img.src = src
            }
            reader.readAsDataURL(file)
          })
          e.target.value = ''
        }}
      />
    </div>
  )
}
