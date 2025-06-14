// app/api/payments/webhook/route.ts - исправленная версия
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateNotification } from '@/lib/payments/tbank'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    
    console.log('Webhook received:', {
      ...body,
      Token: body.Token ? body.Token.substring(0, 10) + '...' : 'none'
    })

    // Валидируем подпись
    if (!validateNotification(body)) {
      console.error('Invalid webhook signature')
      return NextResponse.json({ status: 'ERROR' }, { status: 400 })
    }

    const { OrderId, Status, PaymentId, Amount, Success, Pan, ErrorCode } = body

    // ВАЖНО: Обрабатываем только финальный статус CONFIRMED
    if (Status !== 'CONFIRMED') {
      console.log(`Payment ${PaymentId} status is ${Status}, skipping processing`)
      return NextResponse.json({ status: 'OK' })
    }

    // Находим платеж по OrderId
    const payment = await prisma.payment.findUnique({
      where: { orderId: OrderId },
      include: {
        user: true
      }
    })

    if (!payment) {
      console.error('Payment not found:', OrderId)
      return NextResponse.json({ status: 'ERROR' }, { status: 404 })
    }

    // ВАЖНО: Проверяем, не обработан ли уже этот платеж
    if (payment.status === 'success') {
      console.log(`Payment ${PaymentId} already processed, skipping`)
      return NextResponse.json({ status: 'OK' })
    }

    // Используем транзакцию с блокировкой для предотвращения двойной обработки
    const result = await prisma.$transaction(async (tx) => {
      // Проверяем статус еще раз внутри транзакции
      const lockedPayment = await tx.payment.findUnique({
        where: { orderId: OrderId }
      })

      if (!lockedPayment || lockedPayment.status === 'success') {
        console.log('Payment already processed in another transaction')
        return { alreadyProcessed: true }
      }

      // Обновляем платеж
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: 'success',
          paymentId: String(PaymentId),
          metadata: {
            ...(payment.metadata as object || {}),
            tBankStatus: Status,
            tBankPaymentId: String(PaymentId),
            cardPan: Pan,
            errorCode: ErrorCode,
            updatedAt: new Date().toISOString()
          }
        }
      })

      // Проверяем тип платежа
      if (payment.type === 'deposit') {
        // Обработка пополнения баланса
        await processTopup(payment, tx)
      } else if (payment.contractId) {
        // Обработка оплаты за анализ
        await startAnalysis(payment.contractId)
      }

      return { success: true }
    }, {
      isolationLevel: 'Serializable' // Максимальная изоляция для предотвращения гонок
    })

    // Возвращаем OK для Т-Банк
    return NextResponse.json({ status: 'OK' })

  } catch (error) {
    console.error('Webhook error:', error)
    
    // Если ошибка из-за конфликта транзакций, все равно возвращаем OK
    if (error instanceof Error && error.message.includes('could not serialize')) {
      return NextResponse.json({ status: 'OK' })
    }
    
    return NextResponse.json({ status: 'ERROR' }, { status: 500 })
  }
}

// Функция для обработки пополнения (изменена для работы с транзакцией)
async function processTopup(payment: any, tx: any) {
  try {
    console.log('Processing topup for payment:', payment.id)
    
    // Проверяем, нет ли уже транзакции для этого платежа
    const existingTransaction = await tx.transaction.findFirst({
      where: {
        paymentId: payment.id,
        type: 'deposit'
      }
    })

    if (existingTransaction) {
      console.log('Transaction already exists for this payment')
      return
    }
    
    // Получаем метаданные (бонусы)
    const metadata = payment.metadata as any || {}
    const bonus = metadata.bonus || 0
    const totalAmount = payment.amount + bonus

    // Обновляем баланс пользователя
    const updatedUser = await tx.user.update({
      where: { id: payment.userId },
      data: {
        balance: {
          increment: totalAmount
        }
      }
    })

    // Создаем транзакцию пополнения
    await tx.transaction.create({
      data: {
        userId: payment.userId,
        type: 'deposit',
        amount: payment.amount,
        balance: updatedUser.balance - bonus,
        description: `Пополнение баланса`,
        paymentId: payment.id
      }
    })

    // Если есть бонус, создаем отдельную транзакцию
    if (bonus > 0) {
      await tx.transaction.create({
        data: {
          userId: payment.userId,
          type: 'bonus',
          amount: bonus,
          balance: updatedUser.balance,
          description: `Бонус ${Math.round(bonus / payment.amount * 100)}% за пополнение`,
          metadata: {
            relatedPaymentId: payment.id
          }
        }
      })
    }

    console.log('Topup processed successfully')
  } catch (error) {
    console.error('Error processing topup:', error)
    throw error
  }
}

// Функция для запуска анализа
async function startAnalysis(contractId: number) {
  try {
    // Проверяем статус контракта
    const contract = await prisma.contract.findUnique({
      where: { id: contractId }
    })

    if (!contract) {
      console.log('Contract not found:', contractId)
      return
    }

    // Обновляем статус на paid
    await prisma.contract.update({
      where: { id: contractId },
      data: { 
        status: 'paid',
        paymentMethod: 'card'
      }
    })

    // Вызываем API анализа
    const baseUrl = process.env.NEXTAUTH_URL || 'https://imyrist.ru'
    const response = await fetch(`${baseUrl}/api/contracts/analyze`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Webhook-Token': process.env.WEBHOOK_SECRET || 'internal-webhook-secret'
      },
      body: JSON.stringify({ contractId })
    })

    if (!response.ok) {
      throw new Error(`Analysis API returned ${response.status}`)
    }

    console.log('Analysis started successfully for contract:', contractId)
  } catch (error) {
    console.error('Error starting analysis:', error)
  }
} 