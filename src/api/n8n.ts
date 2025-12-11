/**
 * n8n Workflow API Integration
 *
 * This module handles communication with n8n workflows for image processing.
 * Each function maps to a specific n8n webhook endpoint.
 *
 * Flow for AI Modifier:
 * 1. Frontend sends binary images + parameters to n8n (multipart/form-data)
 * 2. n8n uploads to S3 and processes images
 * 3. n8n returns result URL
 */

const N8N_BASE_URL = '/api/n8n'

interface TransformResult {
  success: boolean
  imageUrl?: string
  error?: string
}

interface GenerateResult {
  success: boolean
  images?: string[]
  error?: string
}

/**
 * Transform an image using n8n workflows
 *
 * Available actions:
 * - remove-bg: Remove background using AI (Nanobanana Pro / Remove.bg)
 * - edit: Open image editor / edit elements
 * - expand: AI outpainting to expand image boundaries
 * - crop: Smart crop to focus on product
 */
export async function transformImage(
  action: 'remove-bg' | 'edit' | 'expand' | 'crop',
  imageId: string,
  imageSrc: string
): Promise<TransformResult> {
  // Map actions to n8n webhook endpoints
  const endpoints: Record<string, string> = {
    'remove-bg': `${N8N_BASE_URL}/remove-background`,
    edit: `${N8N_BASE_URL}/edit-elements`,
    expand: `${N8N_BASE_URL}/expand`,
    crop: `${N8N_BASE_URL}/crop`,
  }

  const endpoint = endpoints[action]

  // In production, make the actual API call:
  /*
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ imageId, imageSrc }),
    })

    if (!response.ok) {
      throw new Error(`Transform failed: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error(`Failed to ${action}:`, error)
    return { success: false, error: String(error) }
  }
  */

  // Mock implementation for demo
  console.log(`[n8n] Calling ${endpoint} for image ${imageId}`)
  console.log(`[n8n] Action: ${action}`)
  console.log(`[n8n] Image source: ${imageSrc.substring(0, 50)}...`)

  // Simulate processing delay
  await new Promise((resolve) => setTimeout(resolve, 2000))

  // In demo mode, return the same image (in production, this would be the processed result)
  return {
    success: true,
    imageUrl: imageSrc, // Would be the transformed image URL from n8n
  }
}

/**
 * Generate new product images via n8n workflow
 * Uses Nanobanana Pro or similar AI image generation
 */
export async function generateImages(params: {
  productDescription: string
  style: string
  count?: number
  aspectRatio?: string
}): Promise<GenerateResult> {
  // In production:
  /*
  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    })

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`)
    }

    return response.json()
  } catch (error) {
    console.error('Image generation failed:', error)
    return { success: false, error: String(error) }
  }
  */

  console.log('[n8n] Generating images:', params)

  // Simulate processing
  await new Promise((resolve) => setTimeout(resolve, 3000))

  // Mock response
  return {
    success: true,
    images: [
      'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=400&h=400&fit=crop',
    ],
  }
}

/**
 * Download an image from the canvas
 * Handles both data URLs and remote URLs
 */
export function downloadImage(src: string, filename: string) {
  const link = document.createElement('a')
  link.href = src
  link.download = filename.includes('.') ? filename : `${filename}.png`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

/**
 * Upload an image to storage (for processing)
 * Returns a URL that can be used with n8n workflows
 */
export async function uploadImage(file: File): Promise<string> {
  // In production, upload to your storage (S3, Cloudinary, etc.):
  /*
  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch('/api/upload', {
    method: 'POST',
    body: formData,
  })

  if (!response.ok) {
    throw new Error('Upload failed')
  }

  const { url } = await response.json()
  return url
  */

  // For demo, convert to data URL
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * n8n Webhook URL for AI Modifier
 * n8n handles S3 uploads server-side to avoid CORS issues
 */
const AI_MODIFIER_WEBHOOK = 'https://n8n.upsidecode.dev/webhook-test/c7ad9039-6633-44c6-8775-97cfa1a4d3a0'

/**
 * AI Modifier - Send to n8n for image transformation
 */

export interface AIModifierParams {
  // Source images (multiple product images supported)
  sourceImages: Array<{
    id: string
    src: string // Base64 or URL
    name: string
  }>
  // Reference image (optional, only one)
  refImage?: {
    src: string // Base64 or URL
    name: string
  }
  // User prompt
  prompt: string
  // Model selection
  model: string
  // Parameters
  perspective: string
  ratio: string
  style: string
  resolution: string
}

export interface AIModifierMetadata {
  prompt?: string
  model?: string
  aspectRatio?: string
  resolution?: string
  generationTime?: number
  predictionId?: string
}

export interface AIModifierResult {
  success: boolean
  imageUrl?: string
  metadata?: AIModifierMetadata
  error?: string
}

/**
 * Convert base64 data URL to File object
 */
function base64ToFile(base64: string, filename: string): File {
  const [header, data] = base64.split(',')
  const contentType = header.match(/:(.*?);/)?.[1] || 'image/png'
  const binary = atob(data)
  const array = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    array[i] = binary.charCodeAt(i)
  }
  return new File([array], filename, { type: contentType })
}

/**
 * Submit AI Modifier request to n8n
 *
 * Sends binary images via multipart/form-data.
 * n8n handles S3 upload and AI processing.
 */
export async function submitAIModifier(params: AIModifierParams): Promise<AIModifierResult> {
  console.log('[n8n] Submitting AI Modifier request:', {
    ...params,
    sourceImages: params.sourceImages.map(img => ({ ...img, src: img.src.substring(0, 50) + '...' })),
    refImage: params.refImage ? { ...params.refImage, src: params.refImage.src.substring(0, 50) + '...' } : null,
  })

  try {
    const formData = new FormData()

    // Add all source images as binary files (productimage1, productimage2, etc.)
    params.sourceImages.forEach((img, index) => {
      const sourceFile = base64ToFile(img.src, img.name)
      formData.append(`productimage${index + 1}`, sourceFile)
    })

    // Add reference image if provided (referenceimage)
    if (params.refImage) {
      const refFile = base64ToFile(params.refImage.src, params.refImage.name)
      formData.append('referenceimage', refFile)
    }

    // Add all parameters as form fields
    formData.append('userPrompt', params.prompt)
    formData.append('model', params.model)
    formData.append('perspective', params.perspective)
    formData.append('aspectRatio', params.ratio)
    formData.append('stylingMode', params.style)
    formData.append('resolution', params.resolution)

    console.log('[n8n] Sending multipart request to n8n webhook...')

    // Set a long timeout for AI generation (5 minutes)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

    const response = await fetch(AI_MODIFIER_WEBHOOK, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('[n8n] AI Modifier response:', result)

    // Extract metadata from n8n response
    const metadata: AIModifierMetadata = {
      prompt: result.prompt,
      model: result.model,
      aspectRatio: result.aspect_ratio || result.aspectRatio,
      resolution: result.resolution,
      generationTime: result.generation_time || result.generationTime,
      predictionId: result.prediction_id || result.predictionId,
    }

    return {
      success: true,
      imageUrl: result.imageUrl || result.output_url || result.image || result.url,
      metadata,
    }
  } catch (error) {
    console.error('[n8n] AI Modifier error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * Convert a File or Blob to base64 string
 */
export function fileToBase64(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}

/**
 * n8n Webhook for Image Edit/Retry
 * Sends existing generated image + edit prompt for refinement
 */
const IMAGE_EDIT_WEBHOOK = 'https://n8n.upsidecode.dev/webhook-test/image-edit'

export interface ImageEditParams {
  // The generated image to edit
  imageId: string
  imageSrc: string // Base64 or URL
  imageName: string
  // Edit prompt describing changes
  editPrompt: string
  // Original metadata (optional, for context)
  originalPrompt?: string
  originalModel?: string
}

export interface ImageEditResult {
  success: boolean
  imageUrl?: string
  metadata?: AIModifierMetadata
  error?: string
}

/**
 * Submit Image Edit request to n8n
 *
 * Sends the existing image + edit instructions for AI refinement.
 * n8n handles the image-to-image transformation.
 */
export async function submitImageEdit(params: ImageEditParams): Promise<ImageEditResult> {
  console.log('[n8n] Submitting Image Edit request:', {
    imageId: params.imageId,
    imageName: params.imageName,
    editPrompt: params.editPrompt,
    imageSrc: params.imageSrc.substring(0, 50) + '...',
  })

  try {
    const formData = new FormData()

    // Add source image as binary file
    const sourceFile = base64ToFile(params.imageSrc, params.imageName)
    formData.append('sourceImage', sourceFile)

    // Add edit prompt
    formData.append('editPrompt', params.editPrompt)

    // Add original context if available
    if (params.originalPrompt) {
      formData.append('originalPrompt', params.originalPrompt)
    }
    if (params.originalModel) {
      formData.append('originalModel', params.originalModel)
    }

    console.log('[n8n] Sending edit request to n8n webhook...')

    // Set a long timeout for AI generation (5 minutes)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5 * 60 * 1000)

    const response = await fetch(IMAGE_EDIT_WEBHOOK, {
      method: 'POST',
      body: formData,
      signal: controller.signal,
    })

    clearTimeout(timeoutId)

    if (!response.ok) {
      throw new Error(`Request failed: ${response.status} ${response.statusText}`)
    }

    const result = await response.json()
    console.log('[n8n] Image Edit response:', result)

    // Extract metadata from n8n response
    const metadata: AIModifierMetadata = {
      prompt: result.prompt || params.editPrompt,
      model: result.model,
      generationTime: result.generation_time || result.generationTime,
      predictionId: result.prediction_id || result.predictionId,
    }

    return {
      success: true,
      imageUrl: result.imageUrl || result.output_url || result.image || result.url,
      metadata,
    }
  } catch (error) {
    console.error('[n8n] Image Edit error:', error)
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

/**
 * n8n Webhook Configuration
 *
 * AI Modifier Webhook receives multipart/form-data:
 *
 * BINARY FILES:
 * - img1: Source image (main product image)
 * - img2: Reference image (optional, for style reference)
 *
 * FORM FIELDS (in body):
 * - userPrompt: string
 * - model: string ("nano-banana-pro", "seedream-4.5", "flux-2")
 * - aspectRatio: string ("1:1", "16:9", etc.)
 * - stylingMode: string ("clean", "hero", "lifestyle", etc.)
 * - resolution: string ("1k", "2k", "4k")
 *
 * In n8n:
 * - Access binary: $binary.img1, $binary.img2
 * - Access fields: $json.body.userPrompt, $json.body.model, etc.
 *
 * n8n WORKFLOW:
 * 1. Receive multipart/form-data with binary images
 * 2. Upload images to S3
 * 3. Call AI API with S3 URLs
 * 4. Return result URL
 *
 * RETURNS:
 * { imageUrl: "https://..." }
 */
