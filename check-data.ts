import { db } from './src/lib/db';

async function checkData() {
  try {
    const result = await db.debt_management.groupBy({
      by: ['debt_type'],
      _count: { id: true }
    });
    console.log('Debt types:', JSON.stringify(result, null, 2));

    const total = await db.debt_management.count();
    console.log('Total debts:', total);

    // Check a few records
    const sample = await db.debt_management.findMany({
      take: 5,
      select: {
        id: true,
        debt_type: true,
        debt_code: true,
        remaining_amount: true
      }
    });
    console.log('Sample records:', JSON.stringify(sample, null, 2));

  } catch (e) {
    console.error('Error:', e);
  } finally {
    await db.$disconnect();
  }
}

checkData();
