import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const email = process.argv[2];
  if (!email) {
    console.log('Uso: node scripts/make-admin.js email@dominio.com');
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.log('Usuário não encontrado:', email);
    process.exit(1);
  }

  if (user.role === 'ADMIN') {
    console.log('Usuário já é ADMIN:', email);
    process.exit(0);
  }

  const updated = await prisma.user.update({
    where: { id: user.id },
    data: { role: 'ADMIN' }
  });

  console.log('Promovido para ADMIN:', updated.email);
  process.exit(0);
}

main().catch((e) => { console.error(e); process.exit(1); });
