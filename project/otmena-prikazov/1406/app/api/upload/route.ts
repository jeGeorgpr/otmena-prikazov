// app/api/upload/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { randomUUID } from 'crypto'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'
const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

const ACCEPTED_TYPES = [
 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
 'application/pdf'
]

export async function POST(request: NextRequest) {
 try {
   console.log('Upload API called')
   
   // Проверяем аутентификацию
   const session = await getServerSession(authOptions)
   console.log('Session:', session)
   
   if (!session?.user?.id) {
     console.log('No session or user ID')
     return NextResponse.json(
       { error: 'Необходима авторизация' },
       { status: 401 }
     )
   }

   console.log('User authenticated:', session.user.id)

   const formData = await request.formData()
   const file = formData.get('file') as File
   const role = formData.get('role') as string
   const description = formData.get('description') as string
   
   console.log('Form data received:', {
     fileName: file?.name,
     fileSize: file?.size,
     fileType: file?.type,
     role,
     description: description?.substring(0, 50) + '...'
   })

   // Валидация файла
   if (!file) {
     return NextResponse.json(
       { error: 'Файл не выбран' },
       { status: 400 }
     )
   }

   // Проверка расширения файла
   const fileExtension = file.name.split('.').pop()?.toLowerCase()
   const allowedExtensions = ['docx', 'pdf']

   if (!allowedExtensions.includes(fileExtension || '')) {
     return NextResponse.json(
       { error: 'Поддерживаются только файлы .docx и .pdf' },
       { status: 400 }
     )
   }

   if (!ACCEPTED_TYPES.includes(file.type)) {
     return NextResponse.json(
       { error: 'Поддерживаются только файлы .docx и .pdf' },
       { status: 400 }
     )
   }

   if (file.size > MAX_FILE_SIZE) {
     return NextResponse.json(
       { error: `Размер файла не должен превышать ${MAX_FILE_SIZE / 1024 / 1024}MB` },
       { status: 400 }
     )
   }

   if (file.size === 0) {
     return NextResponse.json(
       { error: 'Файл пустой' },
       { status: 400 }
     )
   }

   // Валидация роли
   if (!role) {
     return NextResponse.json(
       { error: 'Укажите вашу роль в договоре' },
       { status: 400 }
     )
   }

   // Читаем файл для дополнительных проверок
   const bytes = await file.arrayBuffer()
   const buffer = Buffer.from(bytes)

   // Для PDF проверяем, что это не скан
   if (file.type === 'application/pdf') {
     // Простая проверка - ищем текстовые маркеры в первых килобайтах
     const sample = buffer.toString('utf8', 0, Math.min(buffer.length, 4096))
     const hasTextMarkers = sample.includes('/Type') || sample.includes('/Page') || sample.includes('/Font')
     
     if (!hasTextMarkers) {
       return NextResponse.json(
         { error: 'PDF файл выглядит как отсканированный документ. Пожалуйста, загрузите текстовый PDF.' },
         { status: 400 }
       )
     }
   }

   // Создаем директорию для загрузок, если не существует
   try {
     await mkdir(UPLOAD_DIR, { recursive: true })
   } catch (error) {
     // Директория уже существует
     console.log('Upload directory exists or created')
   }

   // Генерируем уникальное имя файла
   const uniqueFilename = `${randomUUID()}.${fileExtension}`
   const filepath = join(UPLOAD_DIR, uniqueFilename)
   
   console.log('Saving file to:', filepath)

   // Сохраняем файл
   await writeFile(filepath, buffer)

   console.log('File saved successfully')

   // Создаем запись в базе данных
   const contract = await prisma.contract.create({
     data: {
       userId: session.user.id,
       filename: file.name,
       path: uniqueFilename,
       role: role,
       description: description || null,
       status: 'uploaded',
     }
   })

   console.log('Contract created:', contract.id)

   // Проверяем, является ли PDF сканом (опционально)
   if (file.type === 'application/pdf') {
     try {
       const { isPDFScanned } = await import('@/utils/documentParser')
       const isScanned = await isPDFScanned(buffer)
       
       if (isScanned) {
         console.log('PDF appears to be scanned, OCR will be used during analysis')
       }
     } catch (error) {
       console.log('Could not check if PDF is scanned:', error.message)
     }
   }

   return NextResponse.json({
     success: true,
     contractId: contract.id,
     filename: file.name,
     message: 'Файл успешно загружен'
   })

 } catch (error) {
   console.error('Upload error:', error)
   
   return NextResponse.json(
     { 
       error: 'Ошибка при загрузке файла',
       details: error instanceof Error ? error.message : 'Неизвестная ошибка'
     },
     { status: 500 }
   )
 }
}