import { Loader2, Plus } from 'lucide-react'
import type { Message } from '../store/types'
import { useStore } from '../store/useStore'
import { cn } from '@/lib/utils'

interface Props {
  message: Message
}

export function ChatMessage({ message }: Props) {
  const isUser = message.role === 'user'
  const { addImage, transform } = useStore()

  const handleAddToCanvas = () => {
    if (!message.generatedImage) return

    // Load image to get actual dimensions
    const img = new Image()
    img.onload = () => {
      // Get viewport dimensions (canvas area = window minus chat panel)
      const viewportWidth = window.innerWidth - 400
      const viewportHeight = window.innerHeight

      // Calculate center in canvas coordinates (accounting for pan and zoom)
      // The visible center in screen coords is (viewportWidth/2, viewportHeight/2)
      // Convert to canvas coords: (screenX - transform.x) / transform.scale
      const centerCanvasX = (viewportWidth / 2 - transform.x) / transform.scale - img.width / 2
      const centerCanvasY = (viewportHeight / 2 - transform.y) / transform.scale - img.height / 2

      addImage({
        src: message.generatedImage!,
        x: centerCanvasX,
        y: centerCanvasY,
        width: img.width,
        height: img.height,
        name: `Generated ${new Date().toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })}`,
      })
    }
    img.src = message.generatedImage
  }

  return (
    <div className={cn("flex", isUser ? 'justify-end' : 'justify-start')}>
      <div
        className={cn(
          "max-w-[85%] rounded-2xl px-4 py-2.5",
          isUser
            ? 'bg-text text-white rounded-br-md'
            : 'bg-muted-light text-text rounded-bl-md'
        )}
      >
        {/* Text content */}
        <p className="text-sm whitespace-pre-wrap">{message.content}</p>

        {/* Loading state for image generation */}
        {message.isGenerating && (
          <div className="mt-3 flex items-center gap-2 text-indigo-600">
            <Loader2 size={16} className="animate-spin" />
            <span className="text-xs">Bild wird generiert...</span>
          </div>
        )}

        {/* Generated image - clickable to add to canvas */}
        {message.generatedImage && !message.isGenerating && (
          <div className="mt-3">
            <button
              onClick={handleAddToCanvas}
              className="relative group w-full rounded-lg overflow-hidden border-2 border-transparent hover:border-indigo-400 transition-all"
            >
              <img
                src={message.generatedImage}
                alt="Generated"
                className="w-full rounded-lg"
              />
              <div className="absolute inset-0 bg-indigo-600/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Plus size={20} className="text-white" />
                <span className="text-sm font-medium text-white">Zum Canvas hinzufügen</span>
              </div>
            </button>
          </div>
        )}

        {/* Image thumbnails (for uploaded images) */}
        {message.images && message.images.length > 0 && (
          <div className={cn("mt-2", isUser ? 'flex gap-2' : 'grid grid-cols-2 gap-2')}>
            {message.images.map((src, index) => (
              <div key={index} className="relative group">
                <img
                  src={src}
                  alt={`Image ${index + 1}`}
                  className={cn(
                    "object-cover rounded-lg",
                    isUser
                      ? 'w-12 h-12 border border-white/20'
                      : 'w-full aspect-square cursor-pointer hover:opacity-90 transition-opacity'
                  )}
                />
                {!isUser && (
                  <div className="absolute inset-0 bg-text/40 opacity-0 group-hover:opacity-100 transition-opacity rounded-lg flex items-center justify-center">
                    <span className="text-xs text-white bg-text/60 px-2 py-1 rounded">
                      Added to canvas
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Timestamp */}
        <p
          className={cn(
            "text-[10px] mt-1",
            isUser ? 'text-white/60' : 'text-muted'
          )}
        >
          {new Date(message.timestamp).toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </p>
      </div>
    </div>
  )
}
