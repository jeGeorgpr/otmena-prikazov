// app/api/admin/promo/stats/route.ts
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
    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { isAdmin: true }
    })

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Получаем статистику
    const stats = await prisma.promoCode.aggregate({
      _count: true,
      _sum: {
        usageCount: true
      }
    })

    const activeCount = await prisma.promoCode.count({
      where: { isActive: true }
    })

    const totalCredited = await prisma.promoCodeUsage.aggregate({
      where: {
        promoCode: { type: 'credit' }
      },
      _sum: {
        appliedValue: true
      }
    })

    return NextResponse.json({
      total: stats._count,
      active: activeCount,
      totalUsages: stats._sum.usageCount || 0,
      totalCredited: totalCredited._sum.appliedValue || 0
    })

  } catch (error) {
    console.error('Promo stats error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}