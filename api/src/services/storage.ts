// Storage service - simplified for initial deployment
// In production, this would integrate with cloud storage (S3, R2, etc.)

import { writeFile, readFile, unlink } from 'fs/promises'
import { join } from 'path'
import { randomBytes } from 'crypto'

const UPLOAD_DIR = '/tmp/uploads'

// Generate unique filename
function generateFilename(originalName: string): string {
  const ext = originalName.split('.').pop() || 'jpg'
  const id = randomBytes(16).toString('hex')
  return `${id}.${ext}`
}

// Upload file from buffer
export async function uploadBuffer(
  buffer: Buffer,
  originalName: string
): Promise<string> {
  const filename = generateFilename(originalName)
  const filepath = join(UPLOAD_DIR, filename)

  await writeFile(filepath, buffer)

  // Return public URL (in production would be CDN URL)
  return `/uploads/${filename}`
}

// Upload base64 image
export async function uploadBase64(
  base64Data: string,
  filename?: string
): Promise<string> {
  // Extract the actual base64 data
  const base64Content = base64Data.includes(',')
    ? base64Data.split(',')[1]
    : base64Data

  const buffer = Buffer.from(base64Content, 'base64')
  return uploadBuffer(buffer, filename || 'image.png')
}

// Delete file
export async function deleteFile(fileUrl: string): Promise<boolean> {
  try {
    const filename = fileUrl.split('/').pop()
    if (!filename) return false

    const filepath = join(UPLOAD_DIR, filename)
    await unlink(filepath)
    return true
  } catch (error) {
    console.error('Delete error:', error)
    return false
  }
}

// Read file
export async function readUploadedFile(fileUrl: string): Promise<Buffer | null> {
  try {
    const filename = fileUrl.split('/').pop()
    if (!filename) return null

    const filepath = join(UPLOAD_DIR, filename)
    return await readFile(filepath)
  } catch (error) {
    console.error('Read error:', error)
    return null
  }
}

// Generate thumbnail URL (placeholder - would use image processing service)
export function getThumbnailUrl(originalUrl: string, width = 400): string {
  // In production, this would transform the image or return a CDN URL with transforms
  return originalUrl
}
