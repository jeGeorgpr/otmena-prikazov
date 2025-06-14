
// app/api/auth/verify-token/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  try {
    const { token, email } = await request.json()
    
    if (!token || !email) {
      return NextResponse.json(
        { valid: false, error: 'Token and email are required' },
        { status: 400 }
      )
    }
    
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })
    
    if (!verificationToken || verificationToken.identifier !== email) {
      return NextResponse.json({ valid: false })
    }
    
    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token }
      })
      return NextResponse.json({ valid: false })
    }
    
    return NextResponse.json({ valid: true })
  } catch (error) {
    console.error('Token verification error:', error)
    return NextResponse.json(
      { valid: false, error: 'Failed to verify token' },
      { status: 500 }
    )
  }
}