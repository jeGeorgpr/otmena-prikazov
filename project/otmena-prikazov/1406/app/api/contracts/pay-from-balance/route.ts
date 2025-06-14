// app/api/contracts/pay-from-balance/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

const ANALYSIS_PRICE = 199

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { contractId } = await req.json()
    if (!contractId) {
      return NextResponse.json({ error: 'Contract ID required' }, { status: 400 })
    }

    // Используем транзакцию для атомарности операции
    const result = await prisma.$transaction(async (tx) => {
      // Получаем пользователя с блокировкой для предотвращения гонки
      const user = await tx.user.findUnique({
        where: { id: session.user.id },
        select: { balance: true }
      })

      if (!user) {
        throw new Error('User not found')
      }

      // Проверяем баланс
      if (user.balance < ANALYSIS_PRICE) {
        throw new Error('Недостаточно средств на балансе')
      }

      // Проверяем контракт
      const contract = await tx.contract.findFirst({
        where: {
          id: contractId,
          userId: session.user.id
        }
      })

      if (!contract) {
        throw new Error('Contract not found')
      }

      if (contract.status !== 'uploaded') {
        throw new Error('Contract already processed')
      }

      // Списываем средства с баланса
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          balance: {
            decrement: ANALYSIS_PRICE
          }
        }
      })

      // Создаем транзакцию списания
      await tx.transaction.create({
        data: {
          userId: session.user.id,
          type: 'analysis',
          amount: -ANALYSIS_PRICE,
          balance: updatedUser.balance,
          description: `Анализ документа: ${contract.filename}`,
          contractId: contract.id
        }
      })

      // Обновляем контракт
      await tx.contract.update({
        where: { id: contractId },
        data: {
          paymentMethod: 'balance',
          status: 'paid'
        }
      })

      return {
        success: true,
        newBalance: updatedUser.balance
      }
    })

    return NextResponse.json(result)

  } catch (error) {
    console.error('Pay from balance error:', error)
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: error.message.includes('Недостаточно средств') ? 400 : 500 }
      )
    }
    
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}