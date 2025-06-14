// app/api/wallet/transactions/route.ts
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

    const searchParams = req.nextUrl.searchParams
    const type = searchParams.get('type')
    const period = searchParams.get('period')
    const limit = parseInt(searchParams.get('limit') || '100')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Построение фильтров
    const where: any = {
      userId: session.user.id
    }

    // Фильтр по типу
    if (type && type !== 'all') {
      where.type = type
    }

    // Фильтр по периоду
    if (period && period !== 'all') {
      const now = new Date()
      let startDate: Date

      switch (period) {
        case 'today':
          startDate = new Date(now.setHours(0, 0, 0, 0))
          break
        case 'week':
          startDate = new Date(now.setDate(now.getDate() - 7))
          break
        case 'month':
          startDate = new Date(now.setMonth(now.getMonth() - 1))
          break
        case 'year':
          startDate = new Date(now.setFullYear(now.getFullYear() - 1))
          break
        default:
          startDate = new Date(0)
      }

      where.createdAt = {
        gte: startDate
      }
    }

    // Получаем транзакции
    const transactions = await prisma.transaction.findMany({
      where,
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset,
      include: {
        contract: {
          select: {
            filename: true
          }
        },
        payment: {
          select: {
            orderId: true
          }
        }
      }
    })

    // Подсчет статистики
    const stats = await prisma.transaction.aggregate({
      where: {
        userId: session.user.id
      },
      _sum: {
        amount: true
      },
      _count: true
    })

    // Отдельный подсчет по типам
    const depositStats = await prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: { in: ['deposit', 'bonus', 'admin_credit'] }
      },
      _sum: {
        amount: true
      }
    })

    const spentStats = await prisma.transaction.aggregate({
      where: {
        userId: session.user.id,
        type: 'analysis'
      },
      _sum: {
        amount: true
      },
      _count: true
    })

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { balance: true }
    })

    return NextResponse.json({
      transactions,
      stats: {
        totalDeposits: depositStats._sum.amount || 0,
        totalSpent: Math.abs(spentStats._sum.amount || 0),
        totalAnalyses: spentStats._count,
        currentBalance: user?.balance || 0
      }
    })
  } catch (error) {
    console.error('Transactions API error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}