// app/api/transactions/route.ts
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

    // Get query parameters for pagination
    const searchParams = req.nextUrl.searchParams
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

    // Fetch transactions
    const transactions = await prisma.transaction.findMany({
      where: {
        userId: session.user.id
      },
      include: {
        contract: {
          select: {
            id: true,
            filename: true
          }
        },
        payment: {
          select: {
            id: true,
            orderId: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: offset
    })

    // Get total count for pagination
    const total = await prisma.transaction.count({
      where: {
        userId: session.user.id
      }
    })

    return NextResponse.json({
      transactions,
      total,
      limit,
      offset
    })

  } catch (error) {
    console.error('Get transactions error:', error)
    return NextResponse.json({ 
      error: 'Internal server error' 
    }, { status: 500 })
  }
}