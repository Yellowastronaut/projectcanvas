import { Eraser, Pencil, Trash2 } from 'lucide-react'
import type { ImageItem } from '../store/types'
import { useStore } from '../store/useStore'
import { transformImage } from '../api/n8n'

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

  // Inverse scale to keep menu visually consistent regardless of zoom
  const inverseScale = 1 / scale

  // Get display name (truncate if too long)
  const displayName = image.name.length > 15 ? image.name.substring(0, 12) + '...' : image.name

  return (
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
          <button
            onClick={handleRemoveBg}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md transition-all group"
          >
            <Eraser size={16} className="text-slate-300 group-hover:text-white" />
            <span className="text-sm font-medium">Remove BG</span>
          </button>

          <button
            onClick={handleEdit}
            className="flex items-center gap-2 px-3 py-1.5 hover:bg-white/10 rounded-md transition-all group"
          >
            <Pencil size={16} className="text-slate-300 group-hover:text-white" />
            <span className="text-sm font-medium">Edit</span>
          </button>
        </div>

        {/* Separator */}
        <div className="w-px h-6 bg-white/10 mx-1"></div>

        {/* Delete */}
        <button
          onClick={handleDelete}
          className="px-2 py-1.5 hover:bg-red-500/20 text-slate-400 hover:text-red-400 rounded-md transition-colors"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Two parallel diagonal lines // (Upside Code style) */}
      <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 flex gap-1 text-white/40 text-xs font-mono">
        //
      </div>
    </div>
  )
}
