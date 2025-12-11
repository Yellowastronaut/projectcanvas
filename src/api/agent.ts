/**
 * Chat Agent API
 *
 * This module handles communication with the AI agent backend.
 * The agent is a product photography expert that can:
 * - Advise on lighting, composition, perspectives
 * - Generate product images via n8n workflows
 * - Transform existing images (remove bg, expand, crop, etc.)
 * - Adapt images to brand guidelines
 */

interface ImageContext {
  id: string
  src: string
}

interface AgentResponse {
  message: string
  images?: string[]
  toolCalls?: {
    name: string
    params: Record<string, unknown>
    result: unknown
  }[]
}

// Mock responses for demo purposes
const mockResponses: Record<string, AgentResponse> = {
  default: {
    message:
      "I'd be happy to help with your product photography! Could you tell me more about:\n\n1. What product are you photographing?\n2. What's the intended use (Amazon, website, social media)?\n3. Do you have any brand guidelines or color preferences?",
  },
  amazon: {
    message:
      "Great choice for Amazon! For Amazon listings, you'll need:\n\n• **Main Image**: Pure white background (RGB 255,255,255), product fills 85% of frame\n• **Lifestyle Images**: Show the product in use\n• **Size/Scale**: Include objects for reference\n• **Detail Shots**: Close-ups of features\n\nI'm generating some professional shots for you now...",
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1523362628745-0c100150b504?w=400&h=400&fit=crop',
    ],
  },
  background: {
    message:
      "I'll remove the background from your selected image. This will create a clean cutout that you can place on any background.\n\nProcessing now... The result will appear on your canvas shortly.",
    images: [],
  },
  lifestyle: {
    message:
      "Here are some lifestyle shots with a natural, wooden background aesthetic. These work great for eco-friendly or artisanal products!\n\nI've positioned the product to catch natural light from the side, creating soft shadows that add depth without being distracting.",
    images: [
      'https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?w=400&h=400&fit=crop',
      'https://images.unsplash.com/photo-1544376798-89aa6b82c6cd?w=400&h=400&fit=crop',
    ],
  },
}

function getMockResponse(userMessage: string): AgentResponse {
  const lower = userMessage.toLowerCase()

  if (lower.includes('amazon') || lower.includes('listing')) {
    return mockResponses.amazon
  }
  if (lower.includes('background') || lower.includes('remove')) {
    return mockResponses.background
  }
  if (lower.includes('lifestyle') || lower.includes('wooden') || lower.includes('natural')) {
    return mockResponses.lifestyle
  }

  return mockResponses.default
}

/**
 * Send a message to the AI agent
 *
 * In production, this would:
 * 1. POST to /api/agent/chat with the message and context
 * 2. The backend would call Claude/Gemini/OpenAI with tool definitions
 * 3. Tool calls would trigger n8n workflows
 * 4. Results would be returned to the frontend
 */
export async function sendMessageToAgent(
  message: string,
  selectedImage?: ImageContext
): Promise<AgentResponse> {
  // In production, uncomment and use the real API:
  /*
  const response = await fetch('/api/agent/chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      message,
      selectedImage,
      conversationId: getCurrentConversationId(),
    }),
  })

  if (!response.ok) {
    throw new Error('Failed to get agent response')
  }

  return response.json()
  */

  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Log for debugging
  console.log('Agent request:', { message, selectedImage })

  // Return mock response
  const response = getMockResponse(message)
  console.log('Agent response:', response)

  return response
}

/**
 * Tool definitions for the agent
 * These would be sent to the LLM backend to enable tool calling
 */
export const agentTools = [
  {
    name: 'create_images',
    description: 'Generate new product images based on a description and style',
    parameters: {
      type: 'object',
      properties: {
        productDescription: {
          type: 'string',
          description: 'Description of the product to photograph',
        },
        style: {
          type: 'string',
          enum: ['studio_white', 'lifestyle', 'hero_shot', 'detail', 'infographic'],
          description: 'The style of photography',
        },
        count: {
          type: 'number',
          description: 'Number of images to generate (1-4)',
        },
        aspectRatio: {
          type: 'string',
          enum: ['1:1', '4:3', '16:9', '9:16'],
          description: 'Aspect ratio of the output images',
        },
      },
      required: ['productDescription', 'style'],
    },
  },
  {
    name: 'transform_image',
    description: 'Transform an existing image on the canvas',
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['remove-bg', 'expand', 'crop', 'enhance', 'relight'],
          description: 'The transformation to apply',
        },
        imageId: {
          type: 'string',
          description: 'ID of the image to transform',
        },
      },
      required: ['action', 'imageId'],
    },
  },
  {
    name: 'adapt_to_brand',
    description: 'Adapt images to match brand guidelines',
    parameters: {
      type: 'object',
      properties: {
        brandColors: {
          type: 'array',
          items: { type: 'string' },
          description: 'Brand colors in hex format',
        },
        logoUrl: {
          type: 'string',
          description: 'URL to brand logo',
        },
        placement: {
          type: 'string',
          enum: ['amazon', 'shopify', 'instagram', 'website'],
          description: 'Target platform for the images',
        },
      },
      required: ['placement'],
    },
  },
]
