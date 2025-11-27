import { WarehouseType } from '@/types/enum';
import { faker } from '@faker-js/faker';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/prisma/client';


const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});

const prisma = new PrismaClient({
  adapter,
});

async function main() {
  // Config as const (no env vars)
  const BRANCHES = 3;
  const CATEGORIES = 5;
  const MATERIALS = 50;
  const PRODUCTS = 50;
  const USERS = 5;

  console.log('Seeding with:', { BRANCHES, CATEGORIES, MATERIALS, PRODUCTS, USERS });

  // Clear all tables in reverse dependency order (be careful in prod)
  console.log('Cleaning all tables...');
  await prisma.debt_payments.deleteMany();
  await prisma.debt_management.deleteMany();
  await prisma.inventory_transaction_details.deleteMany();
  await prisma.inventory_transactions.deleteMany();
  await prisma.inventory_balances.deleteMany();
  await prisma.order_details.deleteMany();
  await prisma.orders.deleteMany();
  await prisma.purchase_order_details.deleteMany();
  await prisma.purchase_orders.deleteMany();
  await prisma.cash_books.deleteMany();
  await prisma.goods.deleteMany();
  await prisma.bom.deleteMany();
  await prisma.products.deleteMany();
  await prisma.materials.deleteMany();
  await prisma.product_categories.deleteMany();
  await prisma.warehouses.deleteMany();
  await prisma.users.deleteMany();
  await prisma.role_permissions.deleteMany();
  await prisma.permissions.deleteMany();
  await prisma.roles.deleteMany();
  await prisma.suppliers.deleteMany();
  await prisma.supplier_groups.deleteMany();
  await prisma.customers.deleteMany();
  await prisma.customer_groups.deleteMany();
  await prisma.financial_categories.deleteMany();
  await prisma.bank_accounts.deleteMany();
  await prisma.branches.deleteMany();
  await prisma.company_config.deleteMany();

  // Seed in dependency order

  // 1. company_config
  await prisma.company_config.create({
    data: {
      company_name: 'Công Ty TNHH Xuong May Thien An',
      tax_code: '1234567890',
      address: '123 Đường ABC, Quận XYZ, TP.HCM',
      phone: '0123456789',
      email: 'info@thienan.com',
      header_text: 'Header Text',
      footer_text: 'Footer Text',
      logo_url: 'https://example.com/logo.png',
    },
  });

  // 2. branches
  const branches = [];
  for (let i = 0; i < BRANCHES; i++) {
    const b = await prisma.branches.create({
      data: {
        branch_code: `B-${faker.string.alphanumeric(6).toUpperCase()}`,
        branch_name: faker.company.name().substring(0, 255),
        address: faker.location.streetAddress(),
        phone: faker.phone.number().substring(0, 20),
        email: faker.internet.email(),
      },
    });
    branches.push(b);
  }

  // 3. bank_accounts (depends on branches)
  const bankAccounts = [];
  for (let i = 0; i < BRANCHES; i++) {
    const ba = await prisma.bank_accounts.create({
      data: {
        account_number: faker.finance.accountNumber(),
        account_holder: faker.person.fullName(),
        bank_name: faker.company.name(),
        branch_name: faker.location.city(),
        balance: parseFloat(faker.finance.amount({ min: 1000, max: 100000 })),
        branch_id: branches[i].id,
      },
    });
    bankAccounts.push(ba);
  }

  // 4. financial_categories
  const financialCategories = [];
  for (let i = 0; i < 5; i++) {
    const fc = await prisma.financial_categories.create({
      data: {
        category_code: `FC-${faker.string.alphanumeric(6).toUpperCase()}`,
        category_name: faker.commerce.department(),
        type: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
        description: faker.commerce.productDescription(),
      },
    });
    financialCategories.push(fc);
  }

  // 5. customer_groups
  const customerGroups = [];
  for (let i = 0; i < 3; i++) {
    const cg = await prisma.customer_groups.create({
      data: {
        group_code: `CG-${faker.string.alphanumeric(6).toUpperCase()}`,
        group_name: faker.company.name(),
        price_multiplier: parseFloat(faker.number.float({ min: 0.8, max: 1.5 }).toFixed(2)),
        description: faker.commerce.productDescription(),
      },
    });
    customerGroups.push(cg);
  }

  // 6. customers (depends on customer_groups, branches)
  const customers = [];
  for (let i = 0; i < 20; i++) {
    const c = await prisma.customers.create({
      data: {
        customer_code: `C-${faker.string.alphanumeric(7).toUpperCase()}`,
        customer_name: faker.company.name().substring(0, 255),
        phone: faker.phone.number().substring(0, 20),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        customer_group_id: faker.helpers.arrayElement(customerGroups).id,
        branch_id: faker.helpers.arrayElement(branches).id,
        debt_amount: parseFloat(faker.finance.amount({ min: 0, max: 50000 })),
      },
    });
    customers.push(c);
  }

  // 7. supplier_groups
  const supplierGroups = [];
  for (let i = 0; i < 3; i++) {
    const sg = await prisma.supplier_groups.create({
      data: {
        group_code: `SG-${faker.string.alphanumeric(6).toUpperCase()}`,
        group_name: faker.company.name(),
        description: faker.commerce.productDescription(),
      },
    });
    supplierGroups.push(sg);
  }

  // 8. suppliers (depends on supplier_groups, branches)
  const suppliers = [];
  for (let i = 0; i < 10; i++) {
    const s = await prisma.suppliers.create({
      data: {
        supplier_code: `S-${faker.string.alphanumeric(7).toUpperCase()}`,
        supplier_name: faker.company.name().substring(0, 255),
        phone: faker.phone.number().substring(0, 20),
        email: faker.internet.email(),
        address: faker.location.streetAddress(),
        supplier_group_id: faker.helpers.arrayElement(supplierGroups).id,
        branch_id: faker.helpers.arrayElement(branches).id,
        debt_amount: parseFloat(faker.finance.amount({ min: 0, max: 30000 })),
      },
    });
    suppliers.push(s);
  }

  // 9. roles
  const roles = [];
  const roleNames = ['ADMIN', 'MANAGER', 'STAFF'];
  for (let i = 0; i < roleNames.length; i++) {
    const r = await prisma.roles.create({
      data: {
        role_code: roleNames[i],
        role_name: faker.person.jobTitle(),
        description: faker.lorem.sentence(),

      },
    });
    roles.push(r);
  }

  // 10. permissions (reset and add provided data)
  const permissionsData = [
    ['admin.users', 'Quản lý người dùng', 'admin', 'Xem, thêm, sửa, xóa người dùng'],
    ['admin.roles', 'Quản lý vai trò', 'admin', 'Xem, thêm, sửa, xóa vai trò'],
    ['admin.branches', 'Quản lý chi nhánh', 'admin', 'Xem, thêm, sửa, xóa chi nhánh'],
    ['admin.warehouses', 'Quản lý kho', 'admin', 'Xem, thêm, sửa, xóa kho'],
    ['products.categories', 'Quản lý danh mục SP', 'products', 'Xem, thêm, sửa, xóa danh mục'],
    ['products.products', 'Quản lý sản phẩm', 'products', 'Xem, thêm, sửa, xóa sản phẩm'],
    ['products.materials', 'Quản lý NVL', 'products', 'Xem, thêm, sửa, xóa nguyên vật liệu'],
    ['products.bom', 'Quản lý định mức', 'products', 'Xem, thêm, sửa, xóa BOM'],
    ['inventory.import', 'Nhập kho', 'inventory', 'Xem, tạo, duyệt phiếu nhập'],
    ['inventory.export', 'Xuất kho', 'inventory', 'Xem, tạo, duyệt phiếu xuất'],
    ['inventory.transfer', 'Chuyển kho', 'inventory', 'Xem, tạo, duyệt phiếu chuyển'],
    ['inventory.balance', 'Xem tồn kho', 'inventory', 'Xem báo cáo tồn kho'],
    ['sales.customers', 'Quản lý khách hàng', 'sales', 'Xem, thêm, sửa, xóa khách hàng'],
    ['sales.orders', 'Quản lý đơn hàng', 'sales', 'Xem, tạo, sửa, xóa đơn hàng'],
    ['sales.reports', 'Báo cáo bán hàng', 'sales', 'Xem báo cáo bán hàng'],
    ['purchasing.suppliers', 'Quản lý NCC', 'purchasing', 'Xem, thêm, sửa, xóa nhà cung cấp'],
    ['purchasing.orders', 'Quản lý đơn mua', 'purchasing', 'Xem, tạo, sửa, xóa đơn mua'],
    ['finance.cashbooks', 'Quản lý sổ quỹ', 'finance', 'Xem, thêm, sửa, xóa sổ quỹ'],
    ['finance.debts', 'Quản lý công nợ', 'finance', 'Xem, thêm, thanh toán công nợ'],
    ['finance.reports', 'Báo cáo tài chính', 'finance', 'Xem báo cáo tài chính'],
  ];
  const permissions = [];
  for (const [code, name, module, desc] of permissionsData) {
    const p = await prisma.permissions.create({
      data: {
        permission_code: code,
        permission_name: name,
        module,
        description: desc,
      },
    });
    permissions.push(p);
  }

  // 11. role_permissions (depends on roles, permissions)
  // ADMIN KHÔNG CẦN PHÂN QUYỀN TRONG DATABASE
  // ADMIN có toàn quyền tự động thông qua logic trong requirePermission()

  // Lấy role IDs
  const rolesMap = roles.reduce((acc, role) => {
    acc[role.role_code] = role.id;
    return acc;
  }, {} as Record<string, number>);

  // Phân quyền MANAGER - trừ admin.users và admin.roles
  const managerPerms = permissions.filter(p => !['admin.users', 'admin.roles'].includes(p.permission_code));
  const managerRolePerms = managerPerms.map(perm => ({
    role_id: rolesMap.MANAGER,
    permission_id: perm.id,
    can_view: true,
    can_create: true,
    can_edit: true,
    can_delete: true
  }));
  await prisma.role_permissions.createMany({ data: managerRolePerms });

  // Phân quyền STAFF - giới hạn
  const staffPerms = [
    { code: 'products.products', view: true, create: false, edit: false, del: false },
    { code: 'sales.customers', view: true, create: true, edit: false, del: false },
    { code: 'sales.orders', view: true, create: true, edit: true, del: false },
    { code: 'inventory.balance', view: true, create: false, edit: false, del: false },
  ];

  for (const sp of staffPerms) {
    const perm = permissions.find(p => p.permission_code === sp.code);
    if (perm) {
      await prisma.role_permissions.create({
        data: {
          role_id: rolesMap.STAFF,
          permission_id: perm.id,
          can_view: sp.view,
          can_create: sp.create,
          can_edit: sp.edit,
          can_delete: sp.del
        }
      });
    }
  }

  // 12. users (depends on roles, branches)
  const users = [];

  // Create default admin user
  const adminRole = roles.find(r => r.role_code === 'ADMIN');
  if (adminRole) {
    const adminUser = await prisma.users.create({
      data: {
        user_code: 'U-ADMIN001',
        username: 'admin',
        password_hash: 'admin123', // In production, this should be hashed
        full_name: 'Administrator',
        email: 'admin@thienan.com',
        phone: '0123456789',
        branch_id: branches[0].id, // Use first branch
        role_id: adminRole.id,
      },
    });
    users.push(adminUser);
  }

  // Create additional random users
  for (let i = 0; i < USERS; i++) {
    const u = await prisma.users.create({
      data: {
        user_code: `U-${faker.string.alphanumeric(6).toUpperCase()}`,
        username: faker.internet.userName(),
        password_hash: faker.internet.password(),
        full_name: faker.person.fullName(),
        email: faker.internet.email(),
        phone: faker.phone.number().substring(0, 20),
        branch_id: faker.helpers.arrayElement(branches).id,
        role_id: faker.helpers.arrayElement(roles).id,
      },
    });
    users.push(u);
  }

  // 13. warehouses (depends on branches)
  const warehouses = [];
  for (let i = 0; i < BRANCHES * 2; i++) {
    const w = await prisma.warehouses.create({
      data: {
        warehouse_code: `W-${faker.string.alphanumeric(6).toUpperCase()}`,
        warehouse_name: faker.company.name(),
        branch_id: faker.helpers.arrayElement(branches).id,
        address: faker.location.streetAddress(),
        warehouse_type: faker.helpers.arrayElement([...Object.values(WarehouseType)]),
      },
    });
    warehouses.push(w);
  }

  // 14. product_categories
  const categories = [];
  for (let i = 0; i < CATEGORIES; i++) {
    const c = await prisma.product_categories.create({
      data: {
        category_code: `C-${faker.string.alphanumeric(6).toUpperCase()}`,
        category_name: faker.commerce.department(),
        description: faker.commerce.productDescription(),
      },
    });
    categories.push(c);
  }

  // 15. materials (depends on branches)
  const materials = [];
  for (let i = 0; i < MATERIALS; i++) {
    const m = await prisma.materials.create({
      data: {
        material_code: `M-${faker.string.alphanumeric(7).toUpperCase()}`,
        material_name: faker.commerce.productName(),
        unit: faker.helpers.arrayElement(['kg', 'm', 'pcs', 'litre']),
        description: faker.commerce.productDescription(),
        branch_id: faker.helpers.arrayElement(branches).id,
      },
    });
    materials.push(m);
  }

  // 16. products (depends on categories, branches)
  const products = [];
  for (let i = 0; i < PRODUCTS; i++) {
    const p = await prisma.products.create({
      data: {
        product_code: `P-${faker.string.alphanumeric(7).toUpperCase()}`,
        product_name: faker.commerce.productName(),
        category_id: faker.helpers.arrayElement(categories).id,
        description: faker.commerce.productDescription(),
        unit: faker.helpers.arrayElement(['kg', 'm', 'pcs', 'set']),
        cost_price: parseFloat(faker.commerce.price({ max: 1000 })),
        branch_id: faker.helpers.arrayElement(branches).id,
      },
    });
    products.push(p);
  }

  // 17. bom (depends on products, materials)
  for (const p of products) {
    const countBom = faker.number.int({ min: 0, max: 3 });
    const materialChoices = faker.helpers.arrayElements(materials, Math.min(countBom, materials.length));
    for (const mat of materialChoices) {
      try {
        await prisma.bom.create({
          data: {
            product_id: p.id,
            material_id: mat.id,
            quantity: parseFloat(faker.number.float({ min: 0.1, max: 100 }).toFixed(3)),
            unit: mat.unit || 'pcs',
            notes: faker.lorem.sentence(),
          },
        });
      } catch (err) {
        // ignore duplicates
      }
    }
  }

  // 18. goods (depends on products, materials)
  for (const p of products) {
    const countGoods = faker.number.int({ min: 0, max: 2 });
    const goodsMats = faker.helpers.arrayElements(materials, Math.min(countGoods, materials.length));
    for (const mat of goodsMats) {
      try {
        await prisma.goods.create({
          data: {
            product_id: p.id,
            material_id: mat.id,
            sku: `G-${faker.string.alphanumeric(8).toUpperCase()}`,
            quantity: parseFloat(faker.number.float({ min: 0.1, max: 500 }).toFixed(3)),
            unit: mat.unit || 'pcs',
            notes: faker.lorem.sentence(),
          },
        });
      } catch (err) {
        // ignore duplicates
      }
    }
  }

  // 19. inventory_balances (depends on warehouses, products, materials)
  for (const w of warehouses) {
    for (const p of faker.helpers.arrayElements(products, faker.number.int({ min: 0, max: 5 }))) {
      await prisma.inventory_balances.create({
        data: {
          warehouse_id: w.id,
          product_id: p.id,
          quantity: parseFloat(faker.number.float({ min: 0, max: 1000 }).toFixed(3)),
        },
      });
    }
    for (const m of faker.helpers.arrayElements(materials, faker.number.int({ min: 0, max: 5 }))) {
      await prisma.inventory_balances.create({
        data: {
          warehouse_id: w.id,
          material_id: m.id,
          quantity: parseFloat(faker.number.float({ min: 0, max: 1000 }).toFixed(3)),
        },
      });
    }
  }

  // 20. orders (depends on customers, branches, users)
  const orders = [];
  for (let i = 0; i < 20; i++) {
    const o = await prisma.orders.create({
      data: {
        order_code: `O-${faker.string.alphanumeric(8).toUpperCase()}`,
        customer_id: faker.helpers.arrayElement(customers).id,
        branch_id: faker.helpers.arrayElement(branches).id,
        order_date: faker.date.past(),
        total_amount: parseFloat(faker.finance.amount({ min: 1000, max: 100000 })),
        discount_amount: parseFloat(faker.finance.amount({ min: 0, max: 10000 })),
        final_amount: parseFloat(faker.finance.amount({ min: 1000, max: 100000 })),
        status: faker.helpers.arrayElement(['PENDING', 'CONFIRMED', 'COMPLETED']),
        notes: faker.lorem.sentence(),
        created_by: faker.helpers.arrayElement(users).id,
        deposit_amount: parseFloat(faker.finance.amount({ min: 0, max: 50000 })),
        paid_amount: parseFloat(faker.finance.amount({ min: 0, max: 50000 })),
        payment_status: faker.helpers.arrayElement(['UNPAID', 'PARTIAL', 'PAID']),
      },
    });
    orders.push(o);
  }

  // 21. order_details (depends on orders, products)
  for (const o of orders) {
    const detailCount = faker.number.int({ min: 1, max: 5 });
    const productChoices = faker.helpers.arrayElements(products, detailCount);
    for (const p of productChoices) {
      await prisma.order_details.create({
        data: {
          order_id: o.id,
          product_id: p.id,
          quantity: parseFloat(faker.number.float({ min: 1, max: 100 }).toFixed(3)),
          unit_price: parseFloat(faker.commerce.price({ max: 500 })),
          cost_price: p.cost_price,
          total_amount: parseFloat(faker.finance.amount({ min: 100, max: 50000 })),
          notes: faker.lorem.sentence(),
        },
      });
    }
  }

  // 22. purchase_orders (depends on suppliers, branches, users)
  const purchaseOrders = [];
  for (let i = 0; i < 10; i++) {
    const po = await prisma.purchase_orders.create({
      data: {
        po_code: `PO-${faker.string.alphanumeric(8).toUpperCase()}`,
        supplier_id: faker.helpers.arrayElement(suppliers).id,
        branch_id: faker.helpers.arrayElement(branches).id,
        order_date: faker.date.past(),
        expected_date: faker.date.future(),
        total_amount: parseFloat(faker.finance.amount({ min: 1000, max: 50000 })),
        status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'COMPLETED']),
        notes: faker.lorem.sentence(),
        created_by: faker.helpers.arrayElement(users).id,
        deposit_amount: parseFloat(faker.finance.amount({ min: 0, max: 10000 })),
        paid_amount: parseFloat(faker.finance.amount({ min: 0, max: 10000 })),
        payment_status: faker.helpers.arrayElement(['UNPAID', 'PARTIAL', 'PAID']),
      },
    });
    purchaseOrders.push(po);
  }

  // 23. purchase_order_details (depends on purchase_orders, materials)
  for (const po of purchaseOrders) {
    const detailCount = faker.number.int({ min: 1, max: 5 });
    const materialChoices = faker.helpers.arrayElements(materials, detailCount);
    for (const m of materialChoices) {
      await prisma.purchase_order_details.create({
        data: {
          purchase_order_id: po.id,
          material_id: m.id,
          quantity: parseFloat(faker.number.float({ min: 1, max: 100 }).toFixed(3)),
          unit_price: parseFloat(faker.commerce.price({ max: 200 })),
          total_amount: parseFloat(faker.finance.amount({ min: 100, max: 20000 })),
          notes: faker.lorem.sentence(),
          item_code: m.material_code,
          item_name: m.material_name,
          unit: m.unit,
        },
      });
    }
  }

  // 24. cash_books (depends on financial_categories, bank_accounts, users, branches)
  for (let i = 0; i < 50; i++) {
    await prisma.cash_books.create({
      data: {
        transaction_code: `CB-${faker.string.alphanumeric(8).toUpperCase()}`,
        transaction_date: faker.date.past(),
        financial_category_id: faker.helpers.arrayElement(financialCategories).id,
        amount: parseFloat(faker.finance.amount({ min: 100, max: 10000 })),
        transaction_type: faker.helpers.arrayElement(['INCOME', 'EXPENSE']),
        payment_method: faker.helpers.arrayElement(['CASH', 'BANK']),
        bank_account_id: faker.helpers.arrayElement(bankAccounts).id,
        description: faker.lorem.sentence(),
        created_by: faker.helpers.arrayElement(users).id,
        branch_id: faker.helpers.arrayElement(branches).id,
      },
    });
  }

  // 25. debt_management (depends on customers, suppliers)
  const debts = [];
  for (let i = 0; i < 10; i++) {
    const isCustomer = faker.datatype.boolean();
    const dm = await prisma.debt_management.create({
      data: {
        debt_code: `D-${faker.string.alphanumeric(8).toUpperCase()}`,
        customer_id: isCustomer ? faker.helpers.arrayElement(customers).id : null,
        supplier_id: !isCustomer ? faker.helpers.arrayElement(suppliers).id : null,
        debt_type: faker.helpers.arrayElement(['CUSTOMER', 'SUPPLIER']),
        original_amount: parseFloat(faker.finance.amount({ min: 1000, max: 50000 })),
        remaining_amount: parseFloat(faker.finance.amount({ min: 0, max: 50000 })),
        due_date: faker.date.future(),
        status: faker.helpers.arrayElement(['PENDING', 'PAID']),
        notes: faker.lorem.sentence(),
        deposit_amount: parseFloat(faker.finance.amount({ min: 0, max: 10000 })),
        paid_amount: parseFloat(faker.finance.amount({ min: 0, max: 10000 })),
      },
    });
    debts.push(dm);
  }

  // 26. debt_payments (depends on debt_management, bank_accounts, users)
  for (const d of debts) {
    const paymentCount = faker.number.int({ min: 0, max: 3 });
    for (let i = 0; i < paymentCount; i++) {
      await prisma.debt_payments.create({
        data: {
          debt_id: d.id,
          payment_amount: parseFloat(faker.finance.amount({ min: 100, max: 10000 })),
          payment_date: faker.date.past(),
          payment_method: faker.helpers.arrayElement(['CASH', 'BANK']),
          bank_account_id: faker.helpers.arrayElement(bankAccounts).id,
          notes: faker.lorem.sentence(),
          created_by: faker.helpers.arrayElement(users).id,
        },
      });
    }
  }

  // 27. inventory_transactions (depends on warehouses, users)
  const inventoryTransactions = [];
  for (let i = 0; i < 20; i++) {
    const it = await prisma.inventory_transactions.create({
      data: {
        transaction_code: `IT-${faker.string.alphanumeric(8).toUpperCase()}`,
        transaction_type: faker.helpers.arrayElement(['IMPORT', 'EXPORT', 'TRANSFER']),
        from_warehouse_id: faker.helpers.arrayElement(warehouses).id,
        to_warehouse_id: faker.helpers.arrayElement(warehouses).id,
        status: faker.helpers.arrayElement(['PENDING', 'APPROVED', 'COMPLETED']),
        notes: faker.lorem.sentence(),
        created_by: faker.helpers.arrayElement(users).id,
        approved_by: faker.helpers.arrayElement(users).id,
      },
    });
    inventoryTransactions.push(it);
  }

  // 28. inventory_transaction_details (depends on inventory_transactions, products, materials)
  for (const it of inventoryTransactions) {
    const detailCount = faker.number.int({ min: 1, max: 5 });
    const productChoices = faker.helpers.arrayElements(products, detailCount);
    for (const p of productChoices) {
      await prisma.inventory_transaction_details.create({
        data: {
          transaction_id: it.id,
          product_id: p.id,
          quantity: parseFloat(faker.number.float({ min: 1, max: 100 }).toFixed(3)),
          unit_price: parseFloat(faker.commerce.price({ max: 500 })),
          total_amount: parseFloat(faker.finance.amount({ min: 100, max: 50000 })),
          notes: faker.lorem.sentence(),
        },
      });
    }
    const materialChoices = faker.helpers.arrayElements(materials, detailCount);
    for (const m of materialChoices) {
      await prisma.inventory_transaction_details.create({
        data: {
          transaction_id: it.id,
          material_id: m.id,
          quantity: parseFloat(faker.number.float({ min: 1, max: 100 }).toFixed(3)),
          unit_price: parseFloat(faker.commerce.price({ max: 200 })),
          total_amount: parseFloat(faker.finance.amount({ min: 100, max: 20000 })),
          notes: faker.lorem.sentence(),
        },
      });
    }
  }

  console.log('Seeding complete!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
