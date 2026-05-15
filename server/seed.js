import { usersRepo } from './repos/users.js'
import { hashPassword } from './auth.js'

// Clean start: create the first superadmin if no users exist.
export async function seedAdmin() {
  if ((await usersRepo.count()) > 0) return
  const email = process.env.ADMIN_EMAIL || 'admin@example.com'
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456'
  const name = process.env.ADMIN_NAME || 'المدير العام'
  await usersRepo.create({
    name, email,
    password: await hashPassword(password),
    role: 'superadmin',
    orgId: null,
  })
  console.log(`[seed] superadmin created: ${email}`)
}
