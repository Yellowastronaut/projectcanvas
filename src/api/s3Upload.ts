/**
 * S3 Upload via Presigned URLs
 *
 * This module handles direct browser-to-S3 uploads using presigned URLs.
 * The flow:
 * 1. Frontend requests presigned URL from backend
 * 2. Frontend uploads file directly to S3 using presigned URL
 * 3. Frontend sets file visibility to public
 * 4. Returns public URL to use with n8n
 */

// Backend API base URL - adjust to your backend endpoint
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'https://api.upsidecode.dev'

interface PresignedUrlResponse {
  presigned_url: string
  path: string
  method: 'PUT'
  headers: {
    'Content-Type': string
  }
  public_url: string
}

/**
 * Make a POST request to the backend API
 */
async function apiPost<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(data),
  })

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`)
  }

  return response.json()
}

/**
 * Upload a file to S3 using presigned URL
 *
 * @param file - The file to upload
 * @param directory - The S3 directory to upload to
 * @returns Object with public URL and path
 */
export async function uploadToS3(
  file: File,
  directory: 'workflows/uploads' | 'workflows/references' | 'orig-product' = 'workflows/uploads'
): Promise<{ url: string; path: string }> {
  console.log(`[S3] Starting upload for ${file.name} to ${directory}`)

  // Step 1: Get presigned URL from backend
  const data = await apiPost<PresignedUrlResponse>('/api/s3/presigned-url', {
    directory,
    content_type: file.type,
    filename: file.name,
  })

  console.log(`[S3] Got presigned URL, uploading to S3...`)

  // Step 2: Upload file directly to S3 using presigned URL
  const uploadResponse = await fetch(data.presigned_url, {
    method: data.method,
    headers: {
      'Content-Type': data.headers['Content-Type'],
    },
    body: file,
  })

  if (!uploadResponse.ok) {
    throw new Error(`S3 upload failed: ${uploadResponse.status} ${uploadResponse.statusText}`)
  }

  console.log(`[S3] Upload complete, setting visibility...`)

  // Step 3: Set file visibility to public
  await apiPost('/api/s3/set-visibility', { path: data.path })

  console.log(`[S3] Upload successful: ${data.public_url}`)

  return {
    url: data.public_url,
    path: data.path,
  }
}

/**
 * Convert base64 data URL to File object
 */
export function base64ToFile(base64: string, filename: string): File {
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
 * Upload a base64 image to S3
 * Convenience function that converts base64 to File first
 */
export async function uploadBase64ToS3(
  base64: string,
  filename: string,
  directory: 'workflows/uploads' | 'workflows/references' | 'orig-product' = 'workflows/uploads'
): Promise<{ url: string; path: string }> {
  const file = base64ToFile(base64, filename)
  return uploadToS3(file, directory)
}
