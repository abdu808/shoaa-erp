// Single Prisma client. The ONLY module that imports @prisma/client.
// Swapping to PostgreSQL later = change datasource provider + DATABASE_URL,
// run `prisma migrate`. No code change here or in repos.
import { PrismaClient } from '@prisma/client'

export const prisma = new PrismaClient()

export async function disconnect() {
  await prisma.$disconnect()
}
