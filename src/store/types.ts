export interface ImageMetadata {
  prompt?: string
  model?: string
  aspectRatio?: string
  resolution?: string
  generationTime?: number
  predictionId?: string
}

export interface ImageItem {
  id: string
  src: string
  x: number
  y: number
  width: number
  height: number
  name: string
  createdAt: number
  isGenerating?: boolean // True while AI is generating this image
  metadata?: ImageMetadata // AI generation metadata
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  images?: string[]
  generatedImage?: string // Base64 data URL of AI-generated image
  isGenerating?: boolean // True while image is being generated
  timestamp: number
}

export interface CanvasTransform {
  x: number
  y: number
  scale: number
}

export interface SnapGuide {
  type: 'horizontal' | 'vertical' | 'spacing'
  position: number // x for vertical, y for horizontal
  start: number // start of the line
  end: number // end of the line
  gap?: number // for spacing guides
  direction?: 'horizontal' | 'vertical' // for spacing guides: horizontal = side by side, vertical = stacked
}

export interface TextItem {
  id: string
  text: string
  x: number
  y: number
  fontSize: number
  fontFamily: string
  fontWeight: 'normal' | 'bold'
  color: string
  rotation: number
  createdAt: number
}
