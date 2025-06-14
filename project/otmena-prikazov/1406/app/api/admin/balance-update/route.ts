// app/api/admin/balance-update/route.ts
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

    // Note: Role-based access control removed
    // Add role field to User model in schema.prisma if you need admin permissions

    const { userId, amount, description } = await req.json()

    if (!userId || amount === undefined) {
      return NextResponse.json({
        error: 'Требуются userId и amount'
      }, { status: 400 })
    }

    // Обновляем баланс пользователя
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        balance: {
          increment: amount
        }
      }
    })

    // Создаем транзакцию
    await prisma.transaction.create({
      data: {
        userId,
        type: 'admin_credit',
        amount,
        balance: updatedUser.balance,
        description: description || `Административное начисление: ${amount > 0 ? '+' : ''}${amount} ₽`
      }
    })

    return NextResponse.json({
      success: true,
      newBalance: updatedUser.balance
    })

  } catch (error) {
    console.error('Balance update error:', error)
    return NextResponse.json({
      error: 'Internal server error'
    }, { status: 500 })
  }
}