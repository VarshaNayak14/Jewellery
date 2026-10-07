const path = require('path');

require('dotenv').config({
  path: path.resolve(__dirname, '../.env'),
}); // Always load backend/.env

const connectDB = require('./config/db');
const User = require('./models/User');
const { AVAILABLE_PERMISSIONS } = require('./config/permissions');
const { seedLegalPages, seedFooter } = require('./utils/legalDefaults');

// ─── Common default password ────────────────────────────────────────────────
const DEFAULT_PASSWORD = '123456';

// ───────────────────────────────────────────────────────────────────────────
// 1. SUPER ADMIN
// ───────────────────────────────────────────────────────────────────────────
const seedSuperAdmin = async () => {
  const email =
    process.env.SEED_SUPERADMIN_EMAIL || 'superadmin@demo.com';

  const password =
    process.env.SEED_SUPERADMIN_PASSWORD || DEFAULT_PASSWORD;

  let superAdmin = await User.findOne({ email }).select('+password');

  if (superAdmin) {
    superAdmin.role = 'superadmin';
    superAdmin.isActive = true;
    superAdmin.password = password;

    await superAdmin.save();

    console.log(
      `🔄 Super Admin already existed — role/status/password re-synced: ${email}`
    );
  } else {
    superAdmin = await User.create({
      name: 'Super Admin',
      email,
      password,
      role: 'superadmin',
      isActive: true,
    });

    console.log(`✅ Created Super Admin: ${email}`);
  }

  return {
    role: 'Super Admin',
    email,
    password,
  };
};

// ───────────────────────────────────────────────────────────────────────────
// 2. ADMIN
// ───────────────────────────────────────────────────────────────────────────
const seedAdmin = async () => {
  const email =
    process.env.SEED_ADMIN_EMAIL || 'admin@demo.com';

  const password =
    process.env.SEED_ADMIN_PASSWORD || DEFAULT_PASSWORD;

  let admin = await User.findOne({ email }).select('+password');

  if (admin) {
    admin.role = 'admin';
    admin.isActive = true;
    admin.password = password;

    // Give demo admin all available permissions
    admin.permissions = AVAILABLE_PERMISSIONS;

    await admin.save();

    console.log(
      `🔄 Admin already existed — role/status/password/permissions re-synced: ${email}`
    );
  } else {
    admin = await User.create({
      name: 'Admin User',
      email,
      password,
      role: 'admin',
      isActive: true,
      permissions: AVAILABLE_PERMISSIONS,
    });

    console.log(`✅ Created Admin: ${email}`);
  }

  return {
    role: 'Admin',
    email,
    password,
  };
};

// ───────────────────────────────────────────────────────────────────────────
// RUN SEEDER
// ───────────────────────────────────────────────────────────────────────────
const runSeeder = async () => {
  await connectDB();

  try {
    const superAdmin = await seedSuperAdmin();
    const admin = await seedAdmin();
    const pages = [...await seedLegalPages(), ...await seedFooter()]; // footer pages + links — keeps edited ones

    console.log('\n================ ✅ SEEDING COMPLETE ================');
    console.log('Super Admin, Admin and the footer pages have been seeded.\n');

    console.table([
      superAdmin,
      admin,
    ]);
    console.table(pages);

    console.log('\nLogin credentials:');
    console.log('Super Admin:', superAdmin.email);
    console.log('Admin:', admin.email);
    console.log('Default password: 123456');

    console.log('=======================================================\n');
  } catch (error) {
    console.error('❌ Seeder error:', error);
  } finally {
    process.exit();
  }
};

runSeeder();