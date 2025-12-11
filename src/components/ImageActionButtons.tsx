import { useState } from 'react'
import { Wrench, Sparkles } from 'lucide-react'
import type { ImageItem } from '../store/types'
import { ImageToolMenu } from './ImageToolMenu'
import { ImageAIModifier } from './CommandHUD'
import { useStore } from '../store/useStore'

interface Props {
  image: ImageItem
  scale: number
}

// AI Modifier height (approx): status bar + textarea + parameter deck
const AI_MODIFIER_HEIGHT = 280
// Tool menu height (approx)
const TOOL_MENU_HEIGHT = 60
const PADDING = 80 // Extra padding around the content

export function ImageActionButtons({ image, scale }: Props) {
  const [activePanel, setActivePanel] = useState<'none' | 'tools' | 'ai'>('none')
  const { setTransform, transform } = useStore()

  const toggleTools = () => {
    if (activePanel === 'tools') {
      setActivePanel('none')
      return
    }

    setActivePanel('tools')

    // Calculate the total height needed: tool menu + image + buttons
    const buttonsHeight = 50
    const totalHeight = TOOL_MENU_HEIGHT + image.height + buttonsHeight + PADDING * 2
    const totalWidth = image.width + PADDING * 2

    // Get viewport dimensions (minus chat panel)
    const viewportWidth = window.innerWidth - 400
    const viewportHeight = window.innerHeight

    // Calculate scale needed to fit everything
    const scaleX = viewportWidth / totalWidth
    const scaleY = viewportHeight / totalHeight
    const newScale = Math.min(scaleX, scaleY, 1) // Don't zoom in, only out

    // Only adjust if current view doesn't fit
    if (newScale < transform.scale) {
      // Center the tool menu + image in the viewport
      // Tool menu is above the image, so offset the center upward
      const contentCenterX = image.x + image.width / 2
      const contentCenterY = image.y - TOOL_MENU_HEIGHT / 2 + image.height / 2

      const newX = viewportWidth / 2 - contentCenterX * newScale
      const newY = viewportHeight / 2 - contentCenterY * newScale

      setTransform({ x: newX, y: newY, scale: newScale }, true)
    }
  }

  const toggleAI = () => {
    if (activePanel === 'ai') {
      setActivePanel('none')
      return
    }

    setActivePanel('ai')

    // Calculate the total height needed: image + buttons + AI modifier
    const buttonsHeight = 50
    const totalHeight = image.height + buttonsHeight + AI_MODIFIER_HEIGHT + PADDING * 2
    const totalWidth = Math.max(image.width, 650) + PADDING * 2 // AI modifier is ~650px wide

    // Get viewport dimensions (minus chat panel)
    const viewportWidth = window.innerWidth - 400
    const viewportHeight = window.innerHeight

    // Calculate scale needed to fit everything
    const scaleX = viewportWidth / totalWidth
    const scaleY = viewportHeight / totalHeight
    const newScale = Math.min(scaleX, scaleY, 1) // Don't zoom in, only out

    // Only adjust if current view doesn't fit
    if (newScale < transform.scale) {
      // Center the image + modifier in the viewport
      const contentCenterX = image.x + image.width / 2
      const contentCenterY = image.y + (image.height + buttonsHeight + AI_MODIFIER_HEIGHT) / 2

      const newX = viewportWidth / 2 - contentCenterX * newScale
      const newY = viewportHeight / 2 - contentCenterY * newScale

      setTransform({ x: newX, y: newY, scale: newScale }, true)
    }
  }

  return (
    <>
      {/* Action Buttons - centered below image */}
      <div
        className="absolute left-1/2 z-40"
        style={{
          top: image.height + 16 / scale,
          transform: `translateX(-50%) scale(${1 / scale})`,
          transformOrigin: 'top center',
        }}
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2">
          {/* Tools Button */}
          <button
            onClick={toggleTools}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-200 shadow-lg
              ${activePanel === 'tools'
                ? 'bg-[#1A1B25] text-white border border-white/20'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border border-slate-200 hover:border-slate-300'
              }
            `}
          >
            <Wrench size={16} />
            <span>Tools</span>
          </button>

          {/* AI Modifier Button */}
          <button
            onClick={toggleAI}
            className={`
              flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm
              transition-all duration-200 shadow-lg
              ${activePanel === 'ai'
                ? 'bg-[#522CEC] text-white border border-[#522CEC]'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border border-slate-200 hover:border-[#522CEC]/50 hover:text-[#522CEC]'
              }
            `}
          >
            <Sparkles size={16} />
            <span>AI Modifier</span>
          </button>
        </div>
      </div>

      {/* Tools Panel - above image */}
      {activePanel === 'tools' && (
        <ImageToolMenu image={image} scale={scale} />
      )}

      {/* AI Modifier Panel - below buttons */}
      {activePanel === 'ai' && (
        <ImageAIModifier image={image} scale={scale} />
      )}
    </>
  )
}
