// app/api/auth/forgot-password/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { sendPasswordResetEmail } from '@/lib/email'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address')
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = forgotPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      )
    }
    
    const { email } = validationResult.data
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    // Always return success to prevent email enumeration
    if (!user) {
      console.log(`Password reset requested for non-existent email: ${email}`)
      return NextResponse.json({ success: true })
    }
    
    // Delete any existing tokens for this email
    await prisma.verificationToken.deleteMany({
      where: { identifier: email }
    })
    
    // Send reset email
    await sendPasswordResetEmail(email)
    
    // В dev режиме возвращаем ссылку
    if (process.env.NODE_ENV === 'development') {
      const token = await prisma.verificationToken.findFirst({
        where: { identifier: email },
        orderBy: { expires: 'desc' }
      })
      
      if (token) {
        const resetLink = `${process.env.NEXTAUTH_URL}/auth/reset-password?token=${token.token}&email=${encodeURIComponent(email)}`
        return NextResponse.json({ 
          success: true,
          resetLink // Отправляем ссылку только в dev режиме
        })
      }
    }
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to send reset email' },
      { status: 500 }
    )
  }
}