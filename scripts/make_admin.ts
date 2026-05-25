import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
const prisma = new PrismaClient()

async function main() {
    const email = process.argv[2]?.toLowerCase().trim()
    const password = process.argv[3]
    const name = process.argv[4] || "System Admin"

    if (!email) {
        console.error("Please provide an email. Optional: password and name to create/update admin credentials.")
        process.exit(1)
    }

    const existingUser = await prisma.user.findUnique({ where: { email } })
    if (!existingUser && !password) {
        console.error("Admin user does not exist. Provide a password to create database-stored admin credentials.")
        process.exit(1)
    }

    const hashedPassword = password ? await bcrypt.hash(password, 10) : null

    const user = hashedPassword
        ? await prisma.user.upsert({
            where: { email },
            update: {
                password_hash: hashedPassword,
                is_admin: true,
                is_verified: true,
                is_suspended: false,
            },
            create: {
                email,
                name,
                password_hash: hashedPassword,
                role: "admin",
                is_admin: true,
                is_verified: true,
            },
        })
        : await prisma.user.update({
            where: { email },
            data: { is_admin: true }
        })

    console.log(`User ${user.email} is now an admin.`)
}

main()
    .catch(e => console.error(e))
    .finally(async () => await prisma.$disconnect())
