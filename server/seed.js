import { usersRepo } from './repos/users.js'
import { hashPassword } from './auth.js'

// Clean start: create the first superadmin if no users exist.
// Ships ready with default TEST credentials so the system works on first
// deploy WITHOUT any env config. The admin MUST change the password from
// the Settings page after first login (and ideally set JWT_SECRET).
export async function seedAdmin() {
  if ((await usersRepo.count()) > 0) return
  const email = process.env.ADMIN_EMAIL || 'admin@shoaa.local'
  const password = process.env.ADMIN_PASSWORD || '123456'
  const name = process.env.ADMIN_NAME || 'المدير العام'
  await usersRepo.create({
    name, email,
    password: await hashPassword(password),
    role: 'superadmin',
    orgId: null,
  })
  console.log(`[seed] superadmin created: ${email}`)
}
