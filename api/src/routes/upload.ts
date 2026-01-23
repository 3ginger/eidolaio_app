import { Router, Request, Response } from 'express'
import { UTApi } from 'uploadthing/server'
import multer from 'multer'
import { requireAuth } from '../middleware/auth.js'

const router = Router()

// Initialize Uploadthing API
const utapi = new UTApi()

// Configure multer for temporary memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp']
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true)
    } else {
      cb(new Error('Invalid file type'))
    }
  }
})

// Upload endpoint - uploads to Uploadthing
router.post('/', requireAuth, upload.single('file'), async (req: Request, res: Response) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' })
    }

    // Create a File object from the buffer
    const file = new File(
      [req.file.buffer],
      req.file.originalname,
      { type: req.file.mimetype }
    )

    // Upload to Uploadthing
    const response = await utapi.uploadFiles([file])

    if (!response[0]?.data) {
      console.error('Uploadthing error:', response[0]?.error)
      return res.status(500).json({ error: 'Upload to storage failed' })
    }

    const uploadedFile = response[0].data

    res.json({
      url: uploadedFile.ufsUrl || uploadedFile.url,
      key: uploadedFile.key,
      name: uploadedFile.name,
      size: uploadedFile.size
    })
  } catch (error) {
    console.error('Upload error:', error)
    res.status(500).json({ error: 'Upload failed' })
  }
})

// Delete file endpoint
router.delete('/:key', requireAuth, async (req: Request, res: Response) => {
  try {
    const { key } = req.params

    await utapi.deleteFiles(key)

    res.json({ success: true })
  } catch (error) {
    console.error('Delete error:', error)
    res.status(500).json({ error: 'Delete failed' })
  }
})

// Get upload config (for client-side reference)
router.get('/config', (req: Request, res: Response) => {
  res.json({
    maxFileSize: 10 * 1024 * 1024, // 10MB
    allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
    endpoint: '/api/upload'
  })
})

export default router
