// app/api/admin/promo/detailed-stats/route.ts
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

    // Получаем параметры дат
    const searchParams = req.nextUrl.searchParams
    const dateFrom = searchParams.get('from')
    const dateTo = searchParams.get('to')

    // Базовый запрос
    let whereClause: any = {}
    
    if (dateFrom && dateTo) {
      whereClause = {
        usedAt: {
          gte: new Date(dateFrom),
          lte: new Date(dateTo + 'T23:59:59.999Z')
        }
      }
    }

    // Получаем все промокоды с использованиями
    const promoCodes = await prisma.promoCode.findMany({
      include: {
        usages: {
          where: whereClause,
          include: {
            user: {
              select: {
                email: true,
                id: true
              }
            }
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Обрабатываем данные для каждого промокода
    const statsWithRevenue = await Promise.all(
      promoCodes.map(async (promo) => {
        let totalRevenue = 0
        let totalBonus = 0

        // Для каждого использования находим связанные транзакции
        const usagesWithOrders = await Promise.all(
          promo.usages.map(async (usage) => {
            // Находим транзакции пользователя в течение 24 часов после применения промокода
            const transactions = await prisma.transaction.findMany({
              where: {
                userId: usage.userId,
                createdAt: {
                  gte: usage.usedAt,
                  lte: new Date(usage.usedAt.getTime() + 24 * 60 * 60 * 1000) // +24 часа
                },
                OR: [
                  { type: 'deposit' },
                  { type: 'analysis' }
                ]
              },
              include: {
                payment: true,
                contract: {
                  select: {
                    filename: true
                  }
                }
              }
            })

            // Считаем сумму заказов
            let orderAmount = 0
            transactions.forEach(t => {
              if (t.type === 'deposit' && t.amount > 0) {
                orderAmount += t.amount
              } else if (t.type === 'analysis' && t.payment) {
                orderAmount += t.payment.amount
              }
            })

            totalRevenue += orderAmount
            totalBonus += usage.appliedValue

            return {
              id: usage.id,
              usedAt: usage.usedAt,
              userId: usage.userId,
              userEmail: usage.user.email,
              appliedValue: usage.appliedValue,
              orderAmount,
              transactionType: transactions[0]?.type
            }
          })
        )

        // Уникальные пользователи
        const uniqueUsers = new Set(promo.usages.map(u => u.userId)).size

        return {
          code: promo.code,
          type: promo.type,
          totalUsages: promo.usages.length,
          totalRevenue,
          totalBonus,
          uniqueUsers,
          createdAt: promo.createdAt,
          usages: usagesWithOrders
        }
      })
    )

    // Фильтруем только промокоды с использованиями
    const activeStats = statsWithRevenue.filter(stat => stat.totalUsages > 0)

    return NextResponse.json(activeStats)

  } catch (error) {
    console.error('Promo stats error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}