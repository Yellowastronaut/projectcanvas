import { LUYA_SYSTEM_PROMPT } from '../constants/luyaSystemPrompt'

// Chat model for text conversations
const GEMINI_CHAT_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent'

// Image generation model
const GEMINI_IMAGE_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-3-pro-image-preview:generateContent'

interface GeminiPart {
  text?: string
  inline_data?: {
    mime_type: string
    data: string
  }
}

interface GeminiMessage {
  role: 'user' | 'model'
  parts: GeminiPart[]
}

interface ChatRequest {
  message: string
  history?: GeminiMessage[]
  image?: {
    src: string // Base64 data URL
    name: string
  }
}

interface ChatResponse {
  text: string
  generatedImage?: string // Base64 data URL of generated image
  error?: string
}

interface ImageGenerationResponse {
  image?: string // Base64 data URL
  error?: string
}

/**
 * Extract base64 data and mime type from a data URL
 */
function parseDataUrl(dataUrl: string): { mimeType: string; data: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/)
  if (!match) return null
  return {
    mimeType: match[1],
    data: match[2],
  }
}

export async function sendChatMessage({
  message,
  history = [],
  image,
}: ChatRequest): Promise<ChatResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return { text: '', error: 'Gemini API Key nicht konfiguriert' }
  }

  try {
    // Build parts for the current message
    const currentParts: GeminiPart[] = [{ text: message }]

    // Add image if provided
    if (image?.src) {
      const parsed = parseDataUrl(image.src)
      if (parsed) {
        currentParts.unshift({
          inline_data: {
            mime_type: parsed.mimeType,
            data: parsed.data,
          },
        })
      }
    }

    // Build generation config
    const generationConfig: Record<string, unknown> = {
      temperature: 1.0,
      maxOutputTokens: 2048,
    }

    const response = await fetch(`${GEMINI_CHAT_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        system_instruction: {
          parts: [{ text: LUYA_SYSTEM_PROMPT }],
        },
        contents: [...history, { role: 'user', parts: currentParts }],
        generationConfig,
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Gemini] API Error Response:', JSON.stringify(error, null, 2))
      return { text: '', error: error.error?.message || 'API Fehler' }
    }

    const data = await response.json()
    const parts = data.candidates?.[0]?.content?.parts || []

    // Extract text and image from response
    let text = ''
    let generatedImage: string | undefined

    for (const part of parts) {
      if (part.text) {
        text += part.text
      } else if (part.inlineData || part.inline_data) {
        const imageData = part.inlineData || part.inline_data
        if (imageData?.mimeType && imageData?.data) {
          generatedImage = `data:${imageData.mimeType};base64,${imageData.data}`
        }
      }
    }

    return { text, generatedImage }
  } catch (error) {
    console.error('[Gemini] API Error:', error)
    return { text: '', error: 'Netzwerkfehler' }
  }
}

/**
 * Generate an image using Gemini 3 Pro Image Preview
 * @param prompt - The image generation prompt
 * @param imageSize - Resolution: '1K', '2K', or '4K' (default: '2K')
 */
export async function generateImage(
  prompt: string,
  imageSize: '1K' | '2K' | '4K' = '2K'
): Promise<ImageGenerationResponse> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY

  if (!apiKey) {
    return { error: 'Gemini API Key nicht konfiguriert' }
  }

  console.log('[Gemini Image] Generating with size:', imageSize)

  try {
    const response = await fetch(`${GEMINI_IMAGE_URL}?key=${apiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: prompt }],
          },
        ],
        generationConfig: {
          responseModalities: ['IMAGE', 'TEXT'],
          imageConfig: {
            aspectRatio: '4:3',
            imageSize: imageSize,
          },
        },
      }),
    })

    if (!response.ok) {
      const error = await response.json()
      console.error('[Gemini Image] API Error:', JSON.stringify(error, null, 2))
      return { error: error.error?.message || 'Bildgenerierung fehlgeschlagen' }
    }

    const data = await response.json()
    console.log('[Gemini Image] Full Response:', JSON.stringify(data, null, 2))

    const parts = data.candidates?.[0]?.content?.parts || []
    console.log('[Gemini Image] Parts:', parts.length, 'parts found')

    // Find the image in the response
    for (const part of parts) {
      console.log('[Gemini Image] Part keys:', Object.keys(part))
      if (part.inlineData || part.inline_data) {
        const imageData = part.inlineData || part.inline_data
        console.log('[Gemini Image] Found image data, mimeType:', imageData?.mimeType)
        if (imageData?.mimeType && imageData?.data) {
          return { image: `data:${imageData.mimeType};base64,${imageData.data}` }
        }
      }
    }

    return { error: 'Kein Bild in der Antwort gefunden' }
  } catch (error) {
    console.error('[Gemini Image] Error:', error)
    return { error: 'Netzwerkfehler bei Bildgenerierung' }
  }
}

export type { GeminiMessage, ChatRequest, ChatResponse, ImageGenerationResponse }
