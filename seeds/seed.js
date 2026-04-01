const bcrypt = require('bcryptjs');
const path = require('path');

require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });

const { getDatabase, closeDatabase } = require('../src/config/database');

async function seed() {
  console.log('🌱 Starting database seed...\n');

  const db = getDatabase();

  db.exec('DELETE FROM financial_records');
  db.exec('DELETE FROM users');
  db.exec("DELETE FROM sqlite_sequence WHERE name='users' OR name='financial_records'");

  console.log('  ✓ Cleared existing data');

  const salt = await bcrypt.genSalt(12);

  const users = [
    {
      name: 'Admin User',
      email: 'admin@zorvyn.com',
      password: await bcrypt.hash('admin123', salt),
      role: 'admin',
      status: 'active',
    },
    {
      name: 'Analyst User',
      email: 'analyst@zorvyn.com',
      password: await bcrypt.hash('analyst123', salt),
      role: 'analyst',
      status: 'active',
    },
    {
      name: 'Viewer User',
      email: 'viewer@zorvyn.com',
      password: await bcrypt.hash('viewer123', salt),
      role: 'viewer',
      status: 'active',
    },
    {
      name: 'Inactive User',
      email: 'inactive@zorvyn.com',
      password: await bcrypt.hash('inactive123', salt),
      role: 'viewer',
      status: 'inactive',
    },
  ];

  const insertUser = db.prepare(`
    INSERT INTO users (name, email, password, role, status) 
    VALUES (?, ?, ?, ?, ?)
  `);

  const userIds = [];
  for (const user of users) {
    const result = insertUser.run(user.name, user.email, user.password, user.role, user.status);
    userIds.push(result.lastInsertRowid);
  }

  console.log(`  ✓ Created ${users.length} users`);

  const adminId = userIds[0];

  const records = [
    { amount: 75000, type: 'income', category: 'salary', date: '2025-01-15', description: 'January salary', created_by: adminId },
    { amount: 75000, type: 'income', category: 'salary', date: '2025-02-15', description: 'February salary', created_by: adminId },
    { amount: 75000, type: 'income', category: 'salary', date: '2025-03-15', description: 'March salary', created_by: adminId },
    { amount: 15000, type: 'income', category: 'freelance', date: '2025-01-20', description: 'Website redesign project', created_by: adminId },
    { amount: 25000, type: 'income', category: 'freelance', date: '2025-02-28', description: 'Mobile app consulting', created_by: adminId },
    { amount: 8000, type: 'income', category: 'investments', date: '2025-01-31', description: 'Stock dividends Q1', created_by: adminId },
    { amount: 12000, type: 'income', category: 'investments', date: '2025-03-31', description: 'Mutual fund returns', created_by: adminId },
    { amount: 5000, type: 'income', category: 'other', date: '2025-02-14', description: 'Tax refund', created_by: adminId },

    { amount: 20000, type: 'expense', category: 'rent', date: '2025-01-01', description: 'January rent', created_by: adminId },
    { amount: 20000, type: 'expense', category: 'rent', date: '2025-02-01', description: 'February rent', created_by: adminId },
    { amount: 20000, type: 'expense', category: 'rent', date: '2025-03-01', description: 'March rent', created_by: adminId },
    { amount: 4500, type: 'expense', category: 'food', date: '2025-01-10', description: 'Groceries and dining', created_by: adminId },
    { amount: 3800, type: 'expense', category: 'food', date: '2025-02-10', description: 'Groceries and dining', created_by: adminId },
    { amount: 5200, type: 'expense', category: 'food', date: '2025-03-10', description: 'Groceries and dining out', created_by: adminId },
    { amount: 2500, type: 'expense', category: 'transport', date: '2025-01-05', description: 'Fuel and metro pass', created_by: adminId },
    { amount: 3000, type: 'expense', category: 'transport', date: '2025-02-05', description: 'Fuel and cab rides', created_by: adminId },
    { amount: 2800, type: 'expense', category: 'transport', date: '2025-03-05', description: 'Fuel and metro', created_by: adminId },
    { amount: 3500, type: 'expense', category: 'utilities', date: '2025-01-08', description: 'Electricity and internet', created_by: adminId },
    { amount: 3200, type: 'expense', category: 'utilities', date: '2025-02-08', description: 'Electricity and internet', created_by: adminId },
    { amount: 3800, type: 'expense', category: 'utilities', date: '2025-03-08', description: 'Electricity, internet, and water', created_by: adminId },
    { amount: 2000, type: 'expense', category: 'entertainment', date: '2025-01-22', description: 'Movie tickets and streaming', created_by: adminId },
    { amount: 1500, type: 'expense', category: 'entertainment', date: '2025-02-18', description: 'Concert tickets', created_by: adminId },
    { amount: 3000, type: 'expense', category: 'healthcare', date: '2025-01-25', description: 'Health checkup', created_by: adminId },
    { amount: 8500, type: 'expense', category: 'shopping', date: '2025-02-20', description: 'New laptop accessories', created_by: adminId },
    { amount: 15000, type: 'expense', category: 'education', date: '2025-03-01', description: 'Online course subscription', created_by: adminId },
    { amount: 4000, type: 'expense', category: 'shopping', date: '2025-03-15', description: 'Clothing and gear', created_by: adminId },
  ];

  const insertRecord = db.prepare(`
    INSERT INTO financial_records (amount, type, category, date, description, created_by)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const insertRecords = db.transaction(() => {
    for (const record of records) {
      insertRecord.run(
        record.amount,
        record.type,
        record.category,
        record.date,
        record.description,
        record.created_by
      );
    }
  });

  insertRecords();

  console.log(`  ✓ Created ${records.length} financial records`);

  const totalIncome = records
    .filter(r => r.type === 'income')
    .reduce((sum, r) => sum + r.amount, 0);

  const totalExpenses = records
    .filter(r => r.type === 'expense')
    .reduce((sum, r) => sum + r.amount, 0);

  console.log(`\n📊 Seed Summary:`);
  console.log(`   Users    : ${users.length}`);
  console.log(`   Records  : ${records.length}`);
  console.log(`   Income   : ₹${totalIncome.toLocaleString()}`);
  console.log(`   Expenses : ₹${totalExpenses.toLocaleString()}`);
  console.log(`   Balance  : ₹${(totalIncome - totalExpenses).toLocaleString()}`);

  console.log(`\n🔑 Test Credentials (Zorvyn):`);
  console.log(`   Admin   : admin@zorvyn.com   / admin123`);
  console.log(`   Analyst : analyst@zorvyn.com / analyst123`);
  console.log(`   Viewer  : viewer@zorvyn.com  / viewer123`);

  closeDatabase();
  console.log('\n Seed completed successfully!\n');
}

seed().catch((err) => {
  console.error(' Seed failed:', err);
  closeDatabase();
  process.exit(1);
});

