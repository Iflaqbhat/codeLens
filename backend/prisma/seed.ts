import { PrismaClient } from '@prisma/client'
import { hashSync } from 'bcryptjs'

const prisma = new PrismaClient()

async function main() {
  // We'll add bcrypt in Step 2 (auth), for now just create a placeholder
  const user = await prisma.user.upsert({
    where: { email: 'demo@example.com' },
    update: {},
    create: {
      email: 'demo@example.com',
      passwordHash: 'placeholder-hash',
      name: 'Demo User',
    },
  })
  console.log('Seed user created:', user)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
