// app/api/admin/promo/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем права администратора
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем все промокоды
    const promoCodes = await prisma.promoCode.findMany({
      include: {
        _count: {
          select: { usages: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(promoCodes)
  } catch (error) {
    console.error('Get promo codes error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Проверяем права администратора
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!user?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await req.json()
    const { code, type, value, description, validFrom, validUntil, maxUses, isSingleUse } = body

    // Валидация
    if (!code || !type || value === undefined) {
      return NextResponse.json({ 
        error: 'Обязательные поля: code, type, value' 
      }, { status: 400 })
    }

    if (!['credit', 'percentage', 'discount'].includes(type)) {
      return NextResponse.json({ 
        error: 'Тип должен быть: credit, percentage или discount' 
      }, { status: 400 })
    }

    // Создаем промокод
    const promoCode = await prisma.promoCode.create({
      data: {
        code: code.toUpperCase(),
        type,
        value,
        description,
        validFrom: validFrom ? new Date(validFrom) : new Date(),
        validUntil: validUntil ? new Date(validUntil) : null,
        maxUses,
        isSingleUse: isSingleUse !== false
      }
    })

    return NextResponse.json(promoCode)
  } catch (error: any) {
    console.error('Create promo code error:', error)
    
    if (error.code === 'P2002') {
      return NextResponse.json({ 
        error: 'Промокод с таким кодом уже существует' 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}
