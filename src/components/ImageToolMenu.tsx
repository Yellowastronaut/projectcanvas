import { Eraser, Pencil, Trash2 } from 'lucide-react'
import type { ImageItem } from '../store/types'
import { useStore } from '../store/useStore'
import { transformImage } from '../api/n8n'
import { Button } from '@/components/ui/button'
import { Separator } from '@/components/ui/separator'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'

interface Props {
  image: ImageItem
  scale: number
}

export function ImageToolMenu({ image, scale }: Props) {
  const { removeImage, updateImage } = useStore()

  const handleRemoveBg = async () => {
    try {
      const result = await transformImage('remove-bg', image.id, image.src)
      if (result.success && result.imageUrl) {
        updateImage(image.id, { src: result.imageUrl })
      }
    } catch (error) {
      console.error('Failed to remove background:', error)
    }
  }

  const handleEdit = async () => {
    try {
      const result = await transformImage('edit', image.id, image.src)
      if (result.success && result.imageUrl) {
        updateImage(image.id, { src: result.imageUrl })
      }
    } catch (error) {
      console.error('Failed to edit:', error)
    }
  }

  const handleDelete = () => {
    removeImage(image.id)
  }

  const inverseScale = 1 / scale

  return (
    <TooltipProvider>
      <div
        className="absolute left-1/2 z-50 animate-tool-menu-in"
        style={{
          bottom: '100%',
          marginBottom: 16 * inverseScale,
          '--menu-scale': inverseScale,
          transformOrigin: 'bottom center',
        } as React.CSSProperties}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center bg-[#1A1B25] text-white rounded-lg shadow-[0_8px_30px_rgb(0,0,0,0.12)] border border-white/10 p-1">
          {/* Primary Actions */}
          <div className="flex items-center">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRemoveBg}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-white hover:text-white"
                >
                  <Eraser size={16} className="text-slate-300" />
                  <span className="text-sm font-medium">Remove BG</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Remove background with AI</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleEdit}
                  className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 text-white hover:text-white"
                >
                  <Pencil size={16} className="text-slate-300" />
                  <span className="text-sm font-medium">Edit</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Edit image</p>
              </TooltipContent>
            </Tooltip>
          </div>

          <Separator orientation="vertical" className="h-6 mx-1 bg-white/10" />

          {/* Delete */}
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleDelete}
                className="px-2 py-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400"
              >
                <Trash2 size={16} />
              </Button>
            </TooltipTrigger>
            <TooltipContent>
              <p>Delete image</p>
            </TooltipContent>
          </Tooltip>
        </div>

        {/* Upside Code style marker */}
        <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 text-white/40 text-xs font-mono">
          //
        </div>
      </div>
    </TooltipProvider>
  )
}
