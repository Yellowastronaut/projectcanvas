import { create } from 'zustand'
import type { ImageItem, Message, CanvasTransform, SnapGuide, TextItem } from './types'
import { sendChatMessage, generateImage, type GeminiMessage } from '../services/geminiApi'

interface AppState {
  // Canvas state
  images: ImageItem[]
  textItems: TextItem[]
  selectedImageId: string | null
  selectedImageIds: string[]
  selectedTextId: string | null
  transform: CanvasTransform
  snapGuides: SnapGuide[]

  // Chat state
  messages: Message[]
  isChatOpen: boolean
  isLoading: boolean

  // Image actions
  addImage: (image: Omit<ImageItem, 'id' | 'createdAt'>) => string
  updateImage: (id: string, updates: Partial<ImageItem>) => void
  removeImage: (id: string) => void
  removeImages: (ids: string[]) => void
  selectImage: (id: string | null) => void
  selectMultipleImages: (ids: string[]) => void
  toggleImageSelection: (id: string) => void
  clearSelection: () => void

  // Text actions
  addText: (text: Omit<TextItem, 'id' | 'createdAt'>) => string
  updateText: (id: string, updates: Partial<TextItem>) => void
  removeText: (id: string) => void
  selectText: (id: string | null) => void

  // Canvas actions
  setTransform: (transform: Partial<CanvasTransform>, animate?: boolean) => void
  resetTransform: () => void
  setSnapGuides: (guides: SnapGuide[]) => void
  isAnimating: boolean
  setIsAnimating: (animating: boolean) => void

  // Chat actions
  addMessage: (message: Omit<Message, 'id' | 'timestamp'>) => void
  sendChatToAI: (userMessage: string, includeSelectedImage?: boolean) => Promise<void>
  toggleChat: () => void
  setLoading: (loading: boolean) => void
  clearMessages: () => void
  chatError: string | null
}

const generateId = () => Math.random().toString(36).substring(2, 11)

export const useStore = create<AppState>((set, get) => ({
  // Initial state
  images: [],
  textItems: [],
  selectedImageId: null,
  selectedImageIds: [],
  selectedTextId: null,
  transform: { x: 0, y: 0, scale: 1 },
  snapGuides: [],
  isAnimating: false,
  messages: [],
  isChatOpen: true,
  isLoading: false,
  chatError: null,

  // Image actions
  addImage: (image) => {
    const id = generateId()
    const newImage: ImageItem = {
      ...image,
      id,
      createdAt: Date.now(),
    }
    set((state) => ({ images: [...state.images, newImage] }))
    return id
  },

  updateImage: (id, updates) => {
    set((state) => ({
      images: state.images.map((img) =>
        img.id === id ? { ...img, ...updates } : img
      ),
    }))
  },

  removeImage: (id) => {
    set((state) => ({
      images: state.images.filter((img) => img.id !== id),
      selectedImageId: state.selectedImageId === id ? null : state.selectedImageId,
      selectedImageIds: state.selectedImageIds.filter((i) => i !== id),
    }))
  },

  removeImages: (ids) => {
    set((state) => ({
      images: state.images.filter((img) => !ids.includes(img.id)),
      selectedImageId: null,
      selectedImageIds: [],
    }))
  },

  selectImage: (id) => {
    set({ selectedImageId: id, selectedImageIds: id ? [id] : [] })
  },

  selectMultipleImages: (ids) => {
    set({ selectedImageIds: ids, selectedImageId: ids.length > 0 ? ids[0] : null })
  },

  toggleImageSelection: (id) => {
    set((state) => {
      const isSelected = state.selectedImageIds.includes(id)
      if (isSelected) {
        const newIds = state.selectedImageIds.filter((i) => i !== id)
        return {
          selectedImageIds: newIds,
          selectedImageId: newIds.length > 0 ? newIds[0] : null,
        }
      } else {
        return {
          selectedImageIds: [...state.selectedImageIds, id],
          selectedImageId: id,
        }
      }
    })
  },

  clearSelection: () => {
    set({ selectedImageId: null, selectedImageIds: [], selectedTextId: null })
  },

  // Text actions
  addText: (text) => {
    const id = generateId()
    const newText: TextItem = {
      ...text,
      id,
      createdAt: Date.now(),
    }
    set((state) => ({ textItems: [...state.textItems, newText] }))
    return id
  },

  updateText: (id, updates) => {
    set((state) => ({
      textItems: state.textItems.map((t) =>
        t.id === id ? { ...t, ...updates } : t
      ),
    }))
  },

  removeText: (id) => {
    set((state) => ({
      textItems: state.textItems.filter((t) => t.id !== id),
      selectedTextId: state.selectedTextId === id ? null : state.selectedTextId,
    }))
  },

  selectText: (id) => {
    set({ selectedTextId: id, selectedImageId: null, selectedImageIds: [] })
  },

  // Canvas actions
  setTransform: (transform, animate = false) => {
    if (animate) {
      set({ isAnimating: true })
      setTimeout(() => set({ isAnimating: false }), 400)
    }
    set((state) => ({
      transform: { ...state.transform, ...transform },
    }))
  },

  setIsAnimating: (animating) => {
    set({ isAnimating: animating })
  },

  resetTransform: () => {
    set({ transform: { x: 0, y: 0, scale: 1 } })
  },

  setSnapGuides: (guides) => {
    set({ snapGuides: guides })
  },

  // Chat actions
  addMessage: (message) => {
    const newMessage: Message = {
      ...message,
      id: generateId(),
      timestamp: Date.now(),
    }
    set((state) => ({ messages: [...state.messages, newMessage] }))
  },

  sendChatToAI: async (userMessage: string, includeSelectedImage: boolean = false) => {
    const { addMessage, messages, selectedImageId, images } = get()

    // Get the selected image only if explicitly requested
    const selectedImage = includeSelectedImage && selectedImageId
      ? images.find((img) => img.id === selectedImageId)
      : null

    // Add user message to store (NO image stored - it's already on canvas)
    addMessage({
      role: 'user',
      content: selectedImage
        ? `[Bild: ${selectedImage.name}] ${userMessage}`
        : userMessage,
    })

    set({ isLoading: true, chatError: null })

    // Check if user is asking for image generation
    const lowerMessage = userMessage.toLowerCase()
    const imageKeywords = [
      'generiere',
      'erstelle',
      'erzeuge',
      'mach ein bild',
      'generate',
      'create image',
      'bild generieren',
      'bild erstellen',
    ]

    // Check if previous assistant message asked about generating an image
    const lastAssistantMessage = messages.filter((m) => m.role === 'assistant').pop()
    const askedAboutGeneration =
      lastAssistantMessage?.content.toLowerCase().includes('soll ich') &&
      lastAssistantMessage?.content.toLowerCase().includes('generieren')

    // "ja" triggers generation if assistant just asked about it
    const confirmationKeywords = ['ja', 'yes', 'ok', 'klar', 'mach', 'bitte', 'gerne', 'los']
    const isConfirmation =
      askedAboutGeneration && confirmationKeywords.some((k) => lowerMessage.includes(k))

    const wantsImage =
      imageKeywords.some((keyword) => lowerMessage.includes(keyword)) || isConfirmation

    console.log('[Chat] wantsImage:', wantsImage, 'isConfirmation:', isConfirmation)

    // Build history for Gemini (convert our format to Gemini format)
    const history: GeminiMessage[] = messages.map((m) => ({
      role: m.role === 'user' ? 'user' : 'model',
      parts: [{ text: m.content }],
    }))

    // Call Gemini Chat API
    const response = await sendChatMessage({
      message: userMessage,
      history,
      image: selectedImage
        ? { src: selectedImage.src, name: selectedImage.name }
        : undefined,
    })

    if (response.error) {
      set({ isLoading: false, chatError: response.error })
      return
    }

    // If user wants an image, generate it with the Image model
    if (wantsImage) {
      // Add message with loading state
      const generatingMessage = {
        role: 'assistant' as const,
        content: response.text,
        isGenerating: true,
      }
      addMessage(generatingMessage)

      // Extract prompt from Cody's last response (if user just said "ja")
      // Look for text in quotes or after common patterns
      let imagePrompt = userMessage

      if (isConfirmation && lastAssistantMessage) {
        // Try to extract the prompt Cody suggested from the previous message
        const assistantText = lastAssistantMessage.content

        // Look for text in backticks or quotes (the prompt Cody suggested)
        // Try backticks first (common in markdown), then regular quotes
        const backtickMatch = assistantText.match(/`"?([^`]{20,})"?`/)
        const quotedMatch = assistantText.match(/"([^"]{20,})"/)

        if (backtickMatch) {
          // Remove any leading/trailing quotes inside backticks
          imagePrompt = backtickMatch[1].replace(/^"|"$/g, '')
          console.log('[Chat] Extracted prompt from backticks:', imagePrompt.substring(0, 50) + '...')
        } else if (quotedMatch) {
          imagePrompt = quotedMatch[1]
          console.log('[Chat] Extracted prompt from quotes:', imagePrompt.substring(0, 50) + '...')
        } else {
          // Use Cody's full response as context for the image
          imagePrompt = assistantText
          console.log('[Chat] Using full assistant text as prompt')
        }
      }

      // Extract resolution from user message (default: 2K)
      let imageSize: '1K' | '2K' | '4K' = '2K'
      if (lowerMessage.includes('4k')) {
        imageSize = '4K'
      } else if (lowerMessage.includes('1k')) {
        imageSize = '1K'
      } else if (lowerMessage.includes('2k')) {
        imageSize = '2K'
      }

      console.log('[Chat] Using image prompt:', imagePrompt.substring(0, 100) + '...')
      console.log('[Chat] Using image size:', imageSize)
      const imageResponse = await generateImage(imagePrompt, imageSize)

      // Update the message with result
      const currentMessages = get().messages
      const updatedMessages = [...currentMessages]
      const lastIndex = updatedMessages.length - 1

      if (imageResponse.error) {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          content: response.text + `\n\n❌ Bildgenerierung fehlgeschlagen: ${imageResponse.error}`,
          isGenerating: false,
        }
      } else if (imageResponse.image) {
        updatedMessages[lastIndex] = {
          ...updatedMessages[lastIndex],
          content: response.text + '\n\n✓ Bild generiert! Klicke darauf um es zum Canvas hinzuzufügen.',
          generatedImage: imageResponse.image,
          isGenerating: false,
        }
      }

      set({ messages: updatedMessages, isLoading: false })
      return
    }

    // No image generation requested - just add text response
    addMessage({ role: 'assistant', content: response.text })
    set({ isLoading: false })
  },

  toggleChat: () => {
    set((state) => ({ isChatOpen: !state.isChatOpen }))
  },

  setLoading: (loading) => {
    set({ isLoading: loading })
  },

  clearMessages: () => {
    set({ messages: [], chatError: null })
  },
}))
