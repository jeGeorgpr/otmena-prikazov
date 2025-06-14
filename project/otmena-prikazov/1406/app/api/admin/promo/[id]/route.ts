// app/api/admin/promo/\[id\]/route.ts 
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем права администратора через базу данных
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { code, type, value, isActive, validFrom, validUntil, maxUses, isSingleUse } = body

    // Подготавливаем данные для обновления
    const updates: any = {}
    if (code !== undefined) updates.code = code.toUpperCase()
    if (type !== undefined) updates.type = type
    if (value !== undefined) updates.value = value
    if (isActive !== undefined) updates.isActive = isActive
    if (validFrom !== undefined) updates.validFrom = new Date(validFrom)
    if (validUntil !== undefined) updates.validUntil = validUntil ? new Date(validUntil) : null
    if (maxUses !== undefined) updates.maxUses = maxUses
    if (isSingleUse !== undefined) updates.isSingleUse = isSingleUse

    // Обновляем промокод - ИСПРАВЛЕНО: PromoCode с большой буквы P
    const promoCode = await prisma.promoCode.update({
      where: { id: params.id },
      data: updates
    })

    return NextResponse.json(promoCode)
  } catch (error) {
    console.error('Update promo code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем права администратора через базу данных
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    await prisma.promoCode.delete({
      where: { id: params.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Delete promo code error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
