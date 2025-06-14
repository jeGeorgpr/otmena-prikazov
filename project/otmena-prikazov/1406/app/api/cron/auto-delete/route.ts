// app/api/cron/auto-delete/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { join } from 'path'
import { unlink } from 'fs/promises'

const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads'

export const dynamic = 'force-dynamic'

// Эта функция должна вызываться по расписанию (например, раз в день)
export async function GET(req: NextRequest) {
  try {
    // Проверяем секретный ключ для защиты endpoint
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting auto-delete job...')

    // Получаем всех пользователей с включенным автоудалением
    const users = await prisma.user.findMany({
      where: {
        settings: {
          path: ['autoDeleteDocs'],
          equals: true
        }
      },
      select: {
        id: true,
        settings: true
      }
    })

    console.log(`Found ${users.length} users with auto-delete enabled`)

    let deletedCount = 0
    let errorCount = 0

    for (const user of users) {
      const userSettings = user.settings as any
      const deleteAfterDays = userSettings?.deleteAfterDays || 7

      // Находим старые контракты этого пользователя
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - deleteAfterDays)

      const oldContracts = await prisma.contract.findMany({
        where: {
          userId: user.id,
          createdAt: {
            lt: cutoffDate
          },
          status: 'done' // Удаляем только завершенные анализы
        }
      })

      console.log(`User ${user.id}: found ${oldContracts.length} contracts to delete`)

      for (const contract of oldContracts) {
        try {
          // Удаляем файл
          if (contract.path) {
            const filePath = join(UPLOAD_DIR, contract.path)
            try {
              await unlink(filePath)
              console.log(`Deleted file: ${filePath}`)
            } catch (fileError) {
              // Файл может уже не существовать
              console.error(`Failed to delete file: ${filePath}`, fileError)
            }
          }

          // Удаляем запись из БД
          await prisma.contract.delete({
            where: { id: contract.id }
          })

          deletedCount++
        } catch (error) {
          console.error(`Failed to delete contract ${contract.id}:`, error)
          errorCount++
        }
      }
    }

    console.log(`Auto-delete completed. Deleted: ${deletedCount}, Errors: ${errorCount}`)

    return NextResponse.json({
      success: true,
      deleted: deletedCount,
      errors: errorCount
    })

  } catch (error) {
    console.error('Auto-delete job error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}

// Для ручного вызова удаления для конкретного пользователя
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { deleteAll } = await req.json()

    if (deleteAll) {
      // Удаляем все документы пользователя
      const contracts = await prisma.contract.findMany({
        where: { userId: session.user.id }
      })

      let deletedCount = 0

      for (const contract of contracts) {
        try {
          // Удаляем файл
          if (contract.path) {
            const filePath = join(UPLOAD_DIR, contract.path)
            try {
              await unlink(filePath)
            } catch (fileError) {
              console.error(`Failed to delete file: ${filePath}`, fileError)
            }
          }

          // Удаляем запись
          await prisma.contract.delete({
            where: { id: contract.id }
          })

          deletedCount++
        } catch (error) {
          console.error(`Failed to delete contract ${contract.id}:`, error)
        }
      }

      return NextResponse.json({
        success: true,
        deleted: deletedCount
      })
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 })

  } catch (error) {
    console.error('Delete documents error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}