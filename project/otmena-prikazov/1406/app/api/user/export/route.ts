// app/api/user/export/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userData = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        contracts: {
          select: {
            filename: true,
            role: true,
            description: true,
            status: true,
            createdAt: true,
            result: true
          }
        }
      }
    })

    const exportData = {
      user: {
        email: userData?.email,
        createdAt: userData?.createdAt
      },
      analyses: userData?.contracts || [],
      exportedAt: new Date().toISOString()
    }

    return new NextResponse(JSON.stringify(exportData, null, 2), {
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="imyrist-export-${new Date().toISOString().split('T')[0]}.json"`
      }
    })
  } catch (error) {
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}