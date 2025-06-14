// app/api/wallet/topup/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { createPayment } from '@/lib/payments/tbank'
import { randomUUID } from 'crypto'

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { amount } = await req.json()

    // Валидация суммы
    if (!amount || amount < 100) {
      return NextResponse.json({
        error: 'Минимальная сумма пополнения 100 ₽'
      }, { status: 400 })
    }

    if (amount > 50000) {
      return NextResponse.json({
        error: 'Максимальная сумма пополнения 50 000 ₽'
      }, { status: 400 })
    }

    // Рассчитываем бонус
    let bonus = 0
    if (amount >= 10000) {
      bonus = Math.floor(amount * 0.15)
    } else if (amount >= 5000) {
      bonus = Math.floor(amount * 0.10)
    } else if (amount >= 2000) {
      bonus = Math.floor(amount * 0.05)
    }

    const totalAmount = amount + bonus

    // Создаем запись о платеже
    const orderId = `topup-${randomUUID()}`
    const payment = await prisma.payment.create({
      data: {
        userId: session.user.id,
        orderId,
        amount,
        status: 'pending',
        type: 'deposit',
        metadata: {
          bonus,
          totalAmount
        }
      }
    })

    // Создаем платеж в Т-Банк (если настроен)
    if (process.env.TBANK_TERMINAL_KEY && process.env.TBANK_SECRET_KEY) {
      console.log('TOPUP: Calling createPayment with:', {
      orderId: payment.orderId,
      amount,
      email: session.user.email,
      description: `Пополнение баланса на ${amount} ₽`,
      userId: session.user.id,
      metadata: { type: 'topup', bonus }
    });
    const result = await createPayment({
        orderId: payment.orderId,
        amount,
        email: session.user.email!,
        description: `Пополнение баланса на ${amount} ₽`,
        userId: session.user.id,
        metadata: {
          type: 'topup',
          bonus
        }
      })

      if (!result.success) {
        await prisma.payment.delete({
          where: { id: payment.id }
        })

        return NextResponse.json({
          error: result.error
        }, { status: 500 })
      }

      // Обновляем запись с ID платежа
      await prisma.payment.update({
        where: { id: payment.id },
        data: {
          paymentId: result.paymentId,
          status: 'processing'
        }
      })

      return NextResponse.json({
        success: true,
        paymentUrl: result.paymentUrl,
        paymentId: result.paymentId
      })
    } else {
      // Тестовый режим - сразу пополняем баланс
      await prisma.$transaction(async (tx) => {
        // Обновляем баланс пользователя
        const updatedUser = await tx.user.update({
          where: { id: session.user.id },
          data: {
            balance: {
              increment: totalAmount
            }
          }
        })

        // Создаем транзакцию пополнения
        await tx.transaction.create({
          data: {
            userId: session.user.id,
            type: 'deposit',
            amount: amount,
            balance: updatedUser.balance - bonus,
            description: `Пополнение баланса (тестовый режим)`,
            paymentId: payment.id
          }
        })

        // Если есть бонус, создаем отдельную транзакцию
        if (bonus > 0) {
          await tx.transaction.create({
            data: {
              userId: session.user.id,
              type: 'bonus',
              amount: bonus,
              balance: updatedUser.balance,
              description: `Бонус ${Math.round(bonus / amount * 100)}% за пополнение`,
              metadata: {
                relatedPaymentId: payment.id
              }
            }
          })
        }

        // Обновляем статус платежа
        await tx.payment.update({
          where: { id: payment.id },
          data: { status: 'success' }
        })
      })

      return NextResponse.json({
        success: true,
        testMode: true,
        newBalance: (await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { balance: true }
        }))?.balance
      })
    }

  } catch (error) {
    console.error('Topup error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}

// Формируем URL-ы возврата для пополнения кошелька
      const baseUrl = process.env.NEXTAUTH_URL || 'https://imyrist.ru'
      const successUrl = `${baseUrl}/payment/success?type=topup`
      const failUrl = `${baseUrl}/payment/fail?type=topup`