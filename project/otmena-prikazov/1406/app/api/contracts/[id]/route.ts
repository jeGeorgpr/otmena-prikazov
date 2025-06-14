// app/api/contracts/[id]/route.ts - API для получения контракта
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic'

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contractId = parseInt(params.id)
    if (isNaN(contractId)) {
      return NextResponse.json({ error: 'Invalid contract ID' }, { status: 400 })
    }

    console.log('Fetching contract:', contractId, 'for user:', session.user.id)

    const contract = await prisma.contract.findFirst({
      where: {
        id: contractId,
        userId: session.user.id
      }
    })

    if (!contract) {
      console.log('Contract not found:', contractId)
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    console.log('Contract found:', {
      id: contract.id,
      filename: contract.filename,
      status: contract.status,
      hasResult: !!contract.result,
      resultKeys: contract.result ? Object.keys(contract.result) : []
    })

    // Убеждаемся что result правильно передается
    const contractData = {
      ...contract,
      result: contract.result || null
    }

    return NextResponse.json(contractData)

  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}