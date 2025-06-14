const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function makeAdmin() {
  try {
    const email = 'info@imyrist.ru'
    
    const user = await prisma.user.update({
      where: { email },
      data: { isAdmin: true }
    })
    
    console.log(`User ${email} is now admin:`, user.isAdmin)
  } catch (error) {
    console.error('Error:', error)
  } finally {
    await prisma.$disconnect()
  }
}

makeAdmin()
