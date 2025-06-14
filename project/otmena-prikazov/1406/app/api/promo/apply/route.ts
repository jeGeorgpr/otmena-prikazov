// app/api/promo/apply/route.ts
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
      return NextResponse.json({ error: 'Промокод не найден' }, { status: 404 })
    }

    // Проверки валидности
    if (!promoCode.isActive) {
      return NextResponse.json({ error: 'Промокод неактивен' }, { status: 400 })
    }

    const now = new Date()
    if (promoCode.validFrom > now) {
      return NextResponse.json({ error: 'Промокод еще не активен' }, { status: 400 })
    }

    if (promoCode.validUntil && promoCode.validUntil < now) {
      return NextResponse.json({ error: 'Срок действия промокода истек' }, { status: 400 })
    }

    if (promoCode.maxUses && promoCode.usageCount >= promoCode.maxUses) {
      return NextResponse.json({ error: 'Лимит использования промокода исчерпан' }, { status: 400 })
    }

    // Проверка на повторное использование
    if (promoCode.isSingleUse && promoCode.usages.length > 0) {
      return NextResponse.json({ error: 'Вы уже использовали этот промокод' }, { status: 400 })
    }

    // Применяем промокод в транзакции
    const result = await prisma.$transaction(async (tx) => {
      let appliedValue = 0
      let description = ''
      let finalBalance = 0

      // Получаем текущего пользователя
      const user = await tx.user.findUnique({
        where: { id: session.user.id }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Сохраняем начальный баланс
      finalBalance = user.balance

      // Применяем в зависимости от типа
      switch (promoCode.type) {
        case 'credit':
          // Начисление фиксированной суммы
          appliedValue = promoCode.value
          description = `Промокод: +${appliedValue} ₽`
          
          // Обновляем баланс
          const updatedUser = await tx.user.update({
            where: { id: user.id },
            data: {
              balance: {
                increment: appliedValue
              }
            }
          })
          
          finalBalance = updatedUser.balance

          // Создаем транзакцию
          await tx.transaction.create({
            data: {
              userId: user.id,
              type: 'bonus',
              amount: appliedValue,
              balance: finalBalance,
              description,
              metadata: {
                promoCode: promoCode.code
              }
            }
          })
          break

        case 'percentage':
          // Процент от следующей покупки (сохраняем в метаданных)
          appliedValue = promoCode.value
          description = `Промокод: ${appliedValue}% скидка на следующий анализ`
          // Можно сохранить в user.settings для применения при оплате
          const settings = user.settings as any || {}
          settings.pendingDiscount = {
            type: 'percentage',
            value: appliedValue,
            promoCodeId: promoCode.id
          }
          await tx.user.update({
            where: { id: user.id },
            data: { settings }
          })
          break

        case 'discount':
          // Фиксированная скидка на следующую покупку
          appliedValue = promoCode.value
          description = `Промокод: скидка ${appliedValue} ₽ на следующий анализ`
          const settingsDiscount = user.settings as any || {}
          settingsDiscount.pendingDiscount = {
            type: 'fixed',
            value: appliedValue,
            promoCodeId: promoCode.id
          }
          await tx.user.update({
            where: { id: user.id },
            data: { settings: settingsDiscount }
          })
          break

        default:
          throw new Error('Неизвестный тип промокода')
      }

      // Записываем использование промокода
      await tx.promoCodeUsage.create({
        data: {
          promoCodeId: promoCode.id,
          userId: user.id,
          appliedValue
        }
      })

      // Увеличиваем счетчик использований
      await tx.promoCode.update({
        where: { id: promoCode.id },
        data: {
          usageCount: {
            increment: 1
          }
        }
      })

      return {
        type: promoCode.type,
        value: appliedValue,
        description,
        newBalance: promoCode.type === 'credit' ? finalBalance : user.balance
      }
    })

    return NextResponse.json({
      success: true,
      ...result
    })

  } catch (error) {
    console.error('Promo code error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json({ 
        error: error.message 
      }, { status: 400 })
    }
    
    return NextResponse.json({ 
      error: 'Ошибка при применении промокода' 
    }, { status: 500 })
  }
}