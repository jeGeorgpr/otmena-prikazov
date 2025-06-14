import path from 'path'
import fs from 'fs/promises'

export async function ensureUploadDir() {
  const uploadDir = path.join(process.cwd(), 'uploads')
  try {
    await fs.access(uploadDir)
  } catch {
    await fs.mkdir(uploadDir, { recursive: true })
  }
  return uploadDir
}

export function getFilePath(filename: string) {
  return path.join(process.cwd(), 'uploads', filename)
}

export async function readUploadedFile(filename: string) {
  const filePath = getFilePath(filename)
  return await fs.readFile(filePath)
}