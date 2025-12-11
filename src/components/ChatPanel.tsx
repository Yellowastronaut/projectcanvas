import { useState, useRef, useEffect } from 'react'
import { Loader2, ImageIcon, Paperclip, Send, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import { ChatMessage } from './ChatMessage'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

export function ChatPanel() {
  const [input, setInput] = useState('')
  const [attachImage, setAttachImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const {
    messages,
    isChatOpen,
    toggleChat,
    isLoading,
    sendChatToAI,
    chatError,
    selectedImageId,
    images,
    addImage,
  } = useStore()

  const selectedImage = selectedImageId ? images.find((img) => img.id === selectedImageId) : null

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    if (isChatOpen) {
      inputRef.current?.focus()
    }
  }, [isChatOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || isLoading) return

    const userMessage = input.trim()
    setInput('')

    await sendChatToAI(userMessage, attachImage && !!selectedImage)
    setAttachImage(false)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  return (
    <TooltipProvider>
      <div className="h-full w-96 bg-white border border-slate-200 rounded-2xl flex flex-col overflow-hidden bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-slate-50 via-white to-white">
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-center">
          <div>
            <h2 className="text-slate-900 font-bold text-lg">Cody</h2>
            <p className="text-slate-500 text-xs font-mono mt-1">LUYA CANVAS ASSISTANT</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleChat}
            className="text-slate-400 hover:text-slate-900"
          >
            <X size={18} />
          </Button>
        </div>

        {/* Messages */}
        <ScrollArea className="flex-1 p-6">
          <div className="space-y-6">
            {messages.length === 0 && (
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-100 to-purple-200 flex items-center justify-center border border-indigo-200 flex-shrink-0">
                  <span className="text-xs font-bold text-indigo-600">C</span>
                </div>
                <div className="flex-1">
                  <p className="text-slate-700 leading-relaxed text-sm">
                    Hey! Ich bin <span className="font-semibold text-indigo-600">Cody</span>, dein Canvas Assistant. Wer schreibt gerade?
                  </p>
                  <div className="mt-4 text-xs text-slate-400">
                    <p className="font-medium text-slate-500 mb-2">Ich kann dir helfen mit:</p>
                    <ul className="space-y-1.5 text-slate-400">
                      <li>Prompts für Produktfotos formulieren</li>
                      <li>Styling & Komposition beraten</li>
                      <li>Bilder analysieren und verbessern</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}

            {messages.map((message) => (
              <ChatMessage key={message.id} message={message} />
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-slate-500 text-sm">
                <Loader2 size={16} className="animate-spin" />
                <span>Thinking...</span>
              </div>
            )}

            {chatError && (
              <div className="flex items-center gap-2 text-red-500 text-sm bg-red-50 p-3 rounded-lg">
                <span>Error: {chatError}</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>

        {/* Selected image context */}
        {selectedImage && (
          <div className="px-6 py-2 border-t border-slate-100 bg-slate-50/50">
            <button
              type="button"
              onClick={() => setAttachImage(!attachImage)}
              className={cn(
                "flex items-center gap-2 text-[10px] font-mono tracking-wide transition-colors",
                attachImage
                  ? 'text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md'
                  : 'text-slate-500 hover:text-indigo-500'
              )}
            >
              <ImageIcon size={12} />
              <span>{attachImage ? `✓ Bild anhängen: ${selectedImage.name}` : `Bild anhängen: ${selectedImage.name}`}</span>
            </button>
          </div>
        )}

        {/* Input Container */}
        <div className="p-4 bg-slate-50/50 border-t border-slate-100">
          <form onSubmit={handleSubmit}>
            <div className="relative group">
              {/* Glow effect */}
              <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl opacity-0 group-focus-within:opacity-20 transition duration-500 blur" />

              <div className="relative bg-white border border-slate-200 rounded-xl shadow-sm focus-within:border-indigo-300 transition-colors overflow-hidden">
                <Textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="Type a command..."
                  className="border-none focus-visible:ring-0 p-3 text-sm text-slate-700 placeholder-slate-400 resize-none min-h-[80px] shadow-none"
                  disabled={isLoading}
                />

                {/* Actions Toolbar */}
                <div className="px-2 pb-2 flex justify-between items-center">
                  <div className="flex items-center gap-1">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-slate-400 hover:text-primary hover:bg-slate-50"
                        >
                          <Paperclip size={18} />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Upload Image</p>
                      </TooltipContent>
                    </Tooltip>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        const files = Array.from(e.target.files || [])
                        if (files.length === 0) return

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
                              const startX = 100 + (images.length % 3) * 320
                              const startY = 100 + Math.floor(images.length / 3) * 320
                              const staggerOffset = index * 40
                              addImage({
                                src,
                                x: startX + staggerOffset,
                                y: startY + staggerOffset,
                                width,
                                height,
                                name: file.name,
                              })
                            }
                            img.src = src
                          }
                          reader.readAsDataURL(file)
                        })
                        e.target.value = ''
                      }}
                    />
                  </div>

                  <Button
                    type="submit"
                    size="icon"
                    disabled={!input.trim() || isLoading}
                    className="bg-slate-900 hover:bg-primary"
                  >
                    <Send size={16} className="transform rotate-0" />
                  </Button>
                </div>
              </div>
            </div>
          </form>

          <div className="mt-2 px-1">
            <span className="text-[10px] text-muted-foreground font-mono tracking-wide">SHIFT+ENTER FOR NEW LINE</span>
          </div>
        </div>
      </div>
    </TooltipProvider>
  )
}
