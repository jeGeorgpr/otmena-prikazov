// app/api/balance/route.ts
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

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { 
        balance: true,
        email: true,
        isAdmin: true
      }
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Получаем последние транзакции
    const recentTransactions = await prisma.transaction.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 10,
      include: {
        contract: {
          select: {
            filename: true
          }
        }
      }
    })

    return NextResponse.json({
      balance: user.balance,
      email: user.email,
      isAdmin: user.isAdmin,
      recentTransactions
    })
  } catch (error) {
    console.error('Balance API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}