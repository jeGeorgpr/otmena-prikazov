const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcryptjs')

const prisma = new PrismaClient()

async function resetPassword(email, newPassword) {
  try {
    const hashedPassword = await bcrypt.hash(newPassword, 10)
    
    const user = await prisma.user.update({
      where: { email },
      data: { password: hashedPassword }
    })
    
    console.log(`Пароль для ${email} успешно изменен`)
  } catch (error) {
    console.error('Ошибка:', error.message)
  } finally {
    await prisma.$disconnect()
  }
}

// Использование: node reset-password.js email@example.com newpassword123
const [,, email, password] = process.argv
if (email && password) {
  resetPassword(email, password)
} else {
  console.log('Использование: node reset-password.js email@example.com newpassword')
}
