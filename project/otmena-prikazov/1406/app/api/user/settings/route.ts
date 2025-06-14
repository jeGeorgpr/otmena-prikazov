// app/api/user/settings/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

interface UserSettings {
  emailNotifications: boolean
  autoDeleteDocs: boolean
  deleteAfterDays: number
}

const DEFAULT_SETTINGS: UserSettings = {
  emailNotifications: true,
  autoDeleteDocs: false, // По умолчанию отключено
  deleteAfterDays: 7
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    })

    // Если настроек нет, возвращаем дефолтные
    if (!user || !user.settings) {
      return NextResponse.json(DEFAULT_SETTINGS)
    }

    // Объединяем сохраненные настройки с дефолтными (на случай если добавились новые поля)
    const settings = {
      ...DEFAULT_SETTINGS,
      ...(user.settings as unknown as UserSettings)
    }

    return NextResponse.json(settings)
  } catch (error) {
    console.error('Error fetching settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    
    // Получаем текущие настройки
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { settings: true }
    })

    const currentSettings = user?.settings 
      ? { ...DEFAULT_SETTINGS, ...(user.settings as unknown as UserSettings) }
      : DEFAULT_SETTINGS

    // Обновляем только переданные поля
    const updatedSettings = {
      ...currentSettings,
      ...body
    }

    // Сохраняем обновленные настройки
    await prisma.user.update({
      where: { id: session.user.id },
      data: { settings: updatedSettings }
    })

    return NextResponse.json({ success: true, settings: updatedSettings })
  } catch (error) {
    console.error('Error updating settings:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}