const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcryptjs');
const prisma = new PrismaClient();

async function main() {
    const email = 'subashsabari636@gmail.com';
    const newPassword = '123456';

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
        console.log(`User ${email} not found!`);
        return;
    }

    const hash = await bcrypt.hash(newPassword, 10);

    await prisma.user.update({
        where: { email },
        data: { password_hash: hash }
    });

    console.log(`Password for ${email} has been reset to: ${newPassword}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
