// app/api/promo/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { code } = await req.json()
    
    if (!code) {
      return NextResponse.json({ error: 'Промокод обязателен' }, { status: 400 })
    }

    // Ищем промокод
    const promoCode = await prisma.promoCode.findUnique({
      where: { 
        code: code.toUpperCase().trim() 
      },
      include: {
        usages: {
          where: { userId: session.user.id }
        }
      }
    })

    if (!promoCode) {
      return NextResponse.json({ valid: false, error: 'Промокод не найден' })
    }

    // Проверки валидности
    if (!promoCode.isActive) {
      return NextResponse.json({ valid: false, error: 'Промокод неактивен' })
    }

    const now = new Date()
    if (promoCode.validFrom > now) {
      return NextResponse.json({ valid: false, error: 'Промокод еще не активен' })
    }

    if (promoCode.validUntil && promoCode.validUntil < now) {
      return NextResponse.json({ valid: false, error: 'Срок действия промокода истек' })
    }

    if (promoCode.maxUses && promoCode.usageCount >= promoCode.maxUses) {
      return NextResponse.json({ valid: false, error: 'Лимит использования промокода исчерпан' })
    }

    if (promoCode.isSingleUse && promoCode.usages.length > 0) {
      return NextResponse.json({ valid: false, error: 'Вы уже использовали этот промокод' })
    }

    // Формируем описание
    let description = ''
    switch (promoCode.type) {
      case 'credit':
        description = `Начисление ${promoCode.value} ₽ на баланс`
        break
      case 'percentage':
        description = `Скидка ${promoCode.value}% на следующий анализ`
        break
      case 'discount':
        description = `Скидка ${promoCode.value} ₽ на следующий анализ`
        break
    }

    return NextResponse.json({
      valid: true,
      type: promoCode.type,
      value: promoCode.value,
      description
    })

  } catch (error) {
    console.error('Promo check error:', error)
    return NextResponse.json({ 
      valid: false,
      error: 'Ошибка при проверке промокода' 
    })
  }
}