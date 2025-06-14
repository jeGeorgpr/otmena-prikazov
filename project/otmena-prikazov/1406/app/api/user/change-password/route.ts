// app/api/user/change-password/route.ts
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    
    const { currentPassword, newPassword } = await request.json()
    
    if (!currentPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json({ error: 'Invalid input' }, { status: 400 })
    }
    
    // Получаем пользователя с паролем
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { password: true }
    })
    
    if (!user?.password) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    
    // Проверяем текущий пароль
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password)
    
    if (!isPasswordValid) {
      return NextResponse.json({ error: 'Неверный текущий пароль' }, { status: 400 })
    }
    
    // Хешируем новый пароль
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    // Обновляем пароль
    await prisma.user.update({
      where: { id: session.user.id },
      data: { password: hashedPassword }
    })
    
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Change password error:', error)
    return NextResponse.json({ error: 'Failed to change password' }, { status: 500 })
  }
}