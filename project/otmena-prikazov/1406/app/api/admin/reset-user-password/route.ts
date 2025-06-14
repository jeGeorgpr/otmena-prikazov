// app/api/admin/reset-user-password/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    // Проверка прав админа
    if (!session?.user?.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { email, newPassword } = await request.json()
    
    if (!email || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    
    // Найти пользователя
    const user = await prisma.user.findUnique({
      where: { email }
    })
    
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Хешировать новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Обновить пароль
    await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Admin password reset error:', error)
    return NextResponse.json({ error: 'Failed to reset password' }, { status: 500 })
  }
}