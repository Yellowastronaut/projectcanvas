import { useState } from 'react'
import { Wrench, Sparkles } from 'lucide-react'
import type { ImageItem } from '../store/types'
import { ImageToolMenu } from './ImageToolMenu'
import { ImageAIModifier } from './CommandHUD'
import { useStore } from '../store/useStore'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

interface Props {
  image: ImageItem
  scale: number
}

const AI_MODIFIER_HEIGHT = 280
const TOOL_MENU_HEIGHT = 60
const PADDING = 80

export function ImageActionButtons({ image, scale }: Props) {
  const [activePanel, setActivePanel] = useState<'none' | 'tools' | 'ai'>('none')
  const { setTransform, transform } = useStore()

  const toggleTools = () => {
    if (activePanel === 'tools') {
      setActivePanel('none')
      return
    }

    setActivePanel('tools')

    const buttonsHeight = 50
    const totalHeight = TOOL_MENU_HEIGHT + image.height + buttonsHeight + PADDING * 2
    const totalWidth = image.width + PADDING * 2

    const viewportWidth = window.innerWidth - 400
    const viewportHeight = window.innerHeight

    const scaleX = viewportWidth / totalWidth
    const scaleY = viewportHeight / totalHeight
    const newScale = Math.min(scaleX, scaleY, 1)

    if (newScale < transform.scale) {
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

    const buttonsHeight = 50
    const totalHeight = image.height + buttonsHeight + AI_MODIFIER_HEIGHT + PADDING * 2
    const totalWidth = Math.max(image.width, 650) + PADDING * 2

    const viewportWidth = window.innerWidth - 400
    const viewportHeight = window.innerHeight

    const scaleX = viewportWidth / totalWidth
    const scaleY = viewportHeight / totalHeight
    const newScale = Math.min(scaleX, scaleY, 1)

    if (newScale < transform.scale) {
      const contentCenterX = image.x + image.width / 2
      const contentCenterY = image.y + (image.height + buttonsHeight + AI_MODIFIER_HEIGHT) / 2

      const newX = viewportWidth / 2 - contentCenterX * newScale
      const newY = viewportHeight / 2 - contentCenterY * newScale

      setTransform({ x: newX, y: newY, scale: newScale }, true)
    }
  }

  return (
    <>
      {/* Action Buttons */}
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
          <Button
            variant="outline"
            onClick={toggleTools}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg transition-all duration-200",
              activePanel === 'tools'
                ? 'bg-[#1A1B25] text-white border-white/20 hover:bg-[#1A1B25] hover:text-white'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border-slate-200 hover:border-slate-300'
            )}
          >
            <Wrench size={16} />
            <span>Tools</span>
          </Button>

          <Button
            variant="outline"
            onClick={toggleAI}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-sm shadow-lg transition-all duration-200",
              activePanel === 'ai'
                ? 'bg-primary text-white border-primary hover:bg-primary hover:text-white'
                : 'bg-white/90 backdrop-blur-sm text-slate-700 hover:bg-white border-slate-200 hover:border-primary/50 hover:text-primary'
            )}
          >
            <Sparkles size={16} />
            <span>AI Modifier</span>
          </Button>
        </div>
      </div>

      {activePanel === 'tools' && (
        <ImageToolMenu image={image} scale={scale} />
      )}

      {activePanel === 'ai' && (
        <ImageAIModifier image={image} scale={scale} />
      )}
    </>
  )
}
