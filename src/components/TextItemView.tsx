import { useState, useRef, useEffect, useCallback } from 'react'
import { useStore } from '../store/useStore'
import type { TextItem } from '../store/types'
import { Trash2, Bold } from 'lucide-react'

interface Props {
  textItem: TextItem
  gridSize: number
}

// LUYA Brand Fonts
const FONT_FAMILIES = [
  { id: 'Inter', name: 'Inter' },
  { id: 'Space Grotesk', name: 'Space Grotesk' },
]

// LUYA Brand Colors
const COLORS = [
  '#FFFFFF',   // White
  '#1A1B25',   // Dark (primary background)
  '#522CEC',   // Primary Purple
  '#667eea',   // Gradient Purple 1
  '#764ba2',   // Gradient Purple 2
  '#f093fb',   // Gradient Pink
]

export function TextItemView({ textItem, gridSize }: Props) {
  const { selectedTextId, selectText, updateText, removeText, transform } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [showToolbar, setShowToolbar] = useState(false)
  void isResizing // Suppress unused warning - used in handlers
  void showToolbar // Suppress unused warning - used in render
  const textRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dragRef = useRef({ startX: 0, startY: 0, itemX: 0, itemY: 0 })
  const resizeRef = useRef({ startY: 0, startFontSize: 0 })

  const isSelected = selectedTextId === textItem.id

  // Focus input when editing starts
  useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus()
      inputRef.current.select()
    }
  }, [isEditing])

  // Handle click to select
  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    if (!isEditing) {
      selectText(textItem.id)
      setShowToolbar(true)
    }
  }

  // Handle double click to edit
  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation()
    setIsEditing(true)
    selectText(textItem.id)
  }

  // Handle text change
  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    updateText(textItem.id, { text: e.target.value })
  }

  // Handle blur to stop editing
  const handleBlur = () => {
    setIsEditing(false)
    if (!textItem.text.trim()) {
      removeText(textItem.id)
    }
  }

  // Handle key down
  const handleKeyDown = (e: React.KeyboardEvent) => {
    e.stopPropagation()
    if (e.key === 'Escape') {
      setIsEditing(false)
      if (!textItem.text.trim()) {
        removeText(textItem.id)
      }
    }
    if (e.key === 'Delete' && !isEditing && isSelected) {
      removeText(textItem.id)
    }
  }

  // Handle drag start
  const handleDragStart = useCallback((e: React.MouseEvent) => {
    if (isEditing) return
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
    dragRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      itemX: textItem.x,
      itemY: textItem.y,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - dragRef.current.startX) / transform.scale
      const deltaY = (moveEvent.clientY - dragRef.current.startY) / transform.scale
      const newX = Math.round((dragRef.current.itemX + deltaX) / gridSize) * gridSize
      const newY = Math.round((dragRef.current.itemY + deltaY) / gridSize) * gridSize
      updateText(textItem.id, { x: newX, y: newY })
    }

    const handleMouseUp = () => {
      setIsDragging(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [isEditing, textItem.x, textItem.y, textItem.id, transform.scale, gridSize, updateText])

  // Handle resize (font size)
  const handleResizeStart = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsResizing(true)
    resizeRef.current = {
      startY: e.clientY,
      startFontSize: textItem.fontSize,
    }

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaY = (resizeRef.current.startY - moveEvent.clientY) / transform.scale
      const newFontSize = Math.max(12, Math.min(200, resizeRef.current.startFontSize + deltaY * 0.5))
      updateText(textItem.id, { fontSize: Math.round(newFontSize) })
    }

    const handleMouseUp = () => {
      setIsResizing(false)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }

    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
  }, [textItem.fontSize, textItem.id, transform.scale, updateText])

  // Toggle bold
  const toggleBold = () => {
    updateText(textItem.id, { fontWeight: textItem.fontWeight === 'bold' ? 'normal' : 'bold' })
  }

  // Change font
  const changeFont = (fontFamily: string) => {
    updateText(textItem.id, { fontFamily })
  }

  // Change color
  const changeColor = (color: string) => {
    updateText(textItem.id, { color })
  }

  return (
    <div
      ref={textRef}
      data-text-id={textItem.id}
      className={`absolute ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
      style={{
        left: textItem.x,
        top: textItem.y,
        transform: `rotate(${textItem.rotation}deg)`,
        zIndex: isSelected ? 100 : 10,
      }}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseDown={handleDragStart}
      onKeyDown={handleKeyDown}
    >
      {/* Text Content */}
      {isEditing ? (
        <textarea
          ref={inputRef}
          value={textItem.text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          onKeyDown={handleKeyDown}
          className="bg-transparent border-none outline-none resize-none min-w-[100px]"
          style={{
            fontSize: textItem.fontSize,
            fontFamily: textItem.fontFamily,
            fontWeight: textItem.fontWeight,
            color: textItem.color,
            lineHeight: 1.2,
          }}
          autoFocus
        />
      ) : (
        <div
          className={`whitespace-pre-wrap select-none ${isSelected ? 'ring-2 ring-[#522CEC] ring-offset-2 ring-offset-transparent rounded' : ''}`}
          style={{
            fontSize: textItem.fontSize,
            fontFamily: textItem.fontFamily,
            fontWeight: textItem.fontWeight,
            color: textItem.color,
            lineHeight: 1.2,
            minWidth: 50,
            padding: 4,
            textShadow: textItem.color === '#FFFFFF' ? '0 1px 2px rgba(0,0,0,0.5)' : 'none',
          }}
        >
          {textItem.text || 'Double-click to edit'}
        </div>
      )}

      {/* Selection handles and toolbar */}
      {isSelected && !isEditing && (
        <>
          {/* Resize handle (bottom-right) */}
          <div
            className="absolute bg-[#522CEC] border-2 border-white cursor-ns-resize"
            style={{
              bottom: -6 / transform.scale,
              right: -6 / transform.scale,
              width: 12 / transform.scale,
              height: 12 / transform.scale,
              borderRadius: 2 / transform.scale,
            }}
            onMouseDown={handleResizeStart}
          />

          {/* Toolbar */}
          <div
            className="absolute left-1/2 z-50"
            style={{
              bottom: '100%',
              marginBottom: 8 / transform.scale,
              transform: `translateX(-50%) scale(${1 / transform.scale})`,
              transformOrigin: 'bottom center',
            }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-1 bg-[#1A1B25] text-white rounded-lg shadow-lg border border-white/10 p-1">
              {/* Font selector */}
              <select
                value={textItem.fontFamily}
                onChange={(e) => changeFont(e.target.value)}
                className="bg-transparent text-xs px-2 py-1.5 rounded hover:bg-white/10 outline-none cursor-pointer"
              >
                {FONT_FAMILIES.map((font) => (
                  <option key={font.id} value={font.id} className="bg-[#1A1B25]">
                    {font.name}
                  </option>
                ))}
              </select>

              {/* Separator */}
              <div className="w-px h-5 bg-white/10" />

              {/* Bold toggle */}
              <button
                onClick={toggleBold}
                className={`p-1.5 rounded transition-colors ${textItem.fontWeight === 'bold' ? 'bg-[#522CEC]' : 'hover:bg-white/10'}`}
              >
                <Bold size={14} />
              </button>

              {/* Separator */}
              <div className="w-px h-5 bg-white/10" />

              {/* Color picker - LUYA Brand Colors */}
              <div className="flex items-center gap-0.5 px-1">
                {COLORS.map((color) => (
                  <button
                    key={color}
                    onClick={() => changeColor(color)}
                    className={`w-4 h-4 rounded-full border ${textItem.color === color ? 'border-white ring-1 ring-white' : 'border-white/20'}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>

              {/* Separator */}
              <div className="w-px h-5 bg-white/10" />

              {/* Font size display */}
              <span className="text-[10px] font-mono px-2 text-slate-400">
                {textItem.fontSize}px
              </span>

              {/* Separator */}
              <div className="w-px h-5 bg-white/10" />

              {/* Delete */}
              <button
                onClick={() => removeText(textItem.id)}
                className="p-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
