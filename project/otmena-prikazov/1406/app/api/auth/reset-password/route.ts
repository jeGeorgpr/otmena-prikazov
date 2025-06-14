
// app/api/auth/reset-password/route.ts
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { z } from 'zod'

export const dynamic = 'force-dynamic'

const resetPasswordSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    
    // Validate input
    const validationResult = resetPasswordSchema.safeParse(body)
    if (!validationResult.success) {
      return NextResponse.json(
        { error: validationResult.error.errors[0].message },
        { status: 400 }
      )
    }
    
    const { token, email, password } = validationResult.data
    
    // Verify token
    const verificationToken = await prisma.verificationToken.findUnique({
      where: { token }
    })
    
    if (!verificationToken || verificationToken.identifier !== email) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 400 }
      )
    }
    
    // Check if token is expired
    if (new Date() > verificationToken.expires) {
      await prisma.verificationToken.delete({
        where: { token }
      })
      return NextResponse.json(
        { error: 'Token has expired' },
        { status: 400 }
      )
    }
    
    // Hash the new password
    const hashedPassword = await bcrypt.hash(password, 10)
    
    // Update user password
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })
    
    // Delete the used token
    await prisma.verificationToken.delete({
      where: { token }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Password reset error:', error)
    return NextResponse.json(
      { error: 'Failed to reset password' },
      { status: 500 }
    )
  }
}
