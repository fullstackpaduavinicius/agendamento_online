import 'dotenv/config';
import dayjs from 'dayjs';
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  // Especialistas
  const cardiologista = await prisma.specialist.upsert({
    where: { id: '000000000000000000000001' }, // força chave estável no Mongo? Não; use upsert por um campo único? não temos. Então tente pelo par (name,specialty).
    update: {},
    create: {
      name: 'Dra. Ana Cardio',
      specialty: 'Cardiologia',
      bio: 'Especialista em avaliação cardiológica.',
      basePriceCents: 15000,
      active: true
    }
  }).catch(async () => {
    // fallback: procura por nome+especialidade
    const found = await prisma.specialist.findFirst({ where: { name: 'Dra. Ana Cardio', specialty: 'Cardiologia' }});
    return found ?? prisma.specialist.create({
      data: { name: 'Dra. Ana Cardio', specialty: 'Cardiologia', bio: 'Especialista em avaliação cardiológica.', basePriceCents: 15000, active: true }
    });
  });

  const ortopedista = await prisma.specialist.findFirst({ where: { name: 'Dr. Bruno Orto', specialty: 'Ortopedia' }}) 
    ?? await prisma.specialist.create({
      data: { name: 'Dr. Bruno Orto', specialty: 'Ortopedia', bio: 'Focado em lesões esportivas.', basePriceCents: 13000, active: true }
    });

  // Regras (Seg/Qua/Sex com cap 8)
  const ensureRule = async (specId, weekday, cap = 8) => {
    const exists = await prisma.availabilityRule.findFirst({ where: { specialistId: specId, weekday, active: true }});
    if (!exists) {
      await prisma.availabilityRule.create({ data: { specialistId: specId, weekday, defaultCap: cap, active: true }});
    }
  };
  for (const w of [1,3,5]) { // 1=Seg,3=Qua,5=Sex
    await ensureRule(cardiologista.id, w, 8);
    await ensureRule(ortopedista.id,   w, 8);
  }

  // Exemplo: exceção próxima sexta lotado
  const nextFri = dayjs().day() <= 5 ? dayjs().day(5) : dayjs().add(1,'week').day(5);
  const d0 = nextFri.startOf('day').toDate();
  const ex = await prisma.availabilityException.findFirst({ where: { specialistId: cardiologista.id, date: d0 }});
  if (!ex) {
    await prisma.availabilityException.create({
      data: { specialistId: cardiologista.id, date: d0, status: 'FULL', reason: 'Campanha checkups' }
    });
  }

  console.log('Seed concluído.');
}

main().then(()=>process.exit(0)).catch((e)=>{console.error(e);process.exit(1)});
