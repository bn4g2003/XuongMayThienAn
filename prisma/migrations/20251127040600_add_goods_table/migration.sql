-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" SERIAL NOT NULL,
    "account_number" VARCHAR(50) NOT NULL,
    "account_holder" VARCHAR(255) NOT NULL,
    "bank_name" VARCHAR(255) NOT NULL,
    "branch_name" VARCHAR(255),
    "balance" DECIMAL(15,2) DEFAULT 0,
    "branch_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bom" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "material_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "goods" (
    "id" SERIAL NOT NULL,
    "product_id" INTEGER,
    "material_id" INTEGER,
    "sku" VARCHAR(50),
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "unit" VARCHAR(50),
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "goods_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "branches" (
    "id" SERIAL NOT NULL,
    "branch_code" VARCHAR(20) NOT NULL,
    "branch_name" VARCHAR(255) NOT NULL,
    "address" TEXT,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "branches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_books" (
    "id" SERIAL NOT NULL,
    "transaction_code" VARCHAR(50) NOT NULL,
    "transaction_date" DATE NOT NULL,
    "financial_category_id" INTEGER,
    "amount" DECIMAL(15,2) NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "bank_account_id" INTEGER,
    "reference_id" INTEGER,
    "reference_type" VARCHAR(50),
    "description" TEXT,
    "created_by" INTEGER,
    "branch_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_books_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "company_config" (
    "id" SERIAL NOT NULL,
    "company_name" VARCHAR(255) NOT NULL,
    "tax_code" VARCHAR(50),
    "address" TEXT,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "header_text" TEXT,
    "footer_text" TEXT,
    "logo_url" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "company_config_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customer_groups" (
    "id" SERIAL NOT NULL,
    "group_code" VARCHAR(50) NOT NULL,
    "group_name" VARCHAR(255) NOT NULL,
    "price_multiplier" DECIMAL(5,3) DEFAULT 1.000,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" SERIAL NOT NULL,
    "customer_code" VARCHAR(50) NOT NULL,
    "customer_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "customer_group_id" INTEGER,
    "branch_id" INTEGER,
    "debt_amount" DECIMAL(15,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_management" (
    "id" SERIAL NOT NULL,
    "debt_code" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER,
    "supplier_id" INTEGER,
    "debt_type" VARCHAR(20) NOT NULL,
    "original_amount" DECIMAL(15,2) NOT NULL,
    "remaining_amount" DECIMAL(15,2) NOT NULL,
    "due_date" DATE,
    "reference_id" INTEGER,
    "reference_type" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "notes" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deposit_amount" DECIMAL(15,2) DEFAULT 0,
    "paid_amount" DECIMAL(15,2) DEFAULT 0,

    CONSTRAINT "debt_management_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "debt_payments" (
    "id" SERIAL NOT NULL,
    "debt_id" INTEGER,
    "payment_amount" DECIMAL(15,2) NOT NULL,
    "payment_date" DATE NOT NULL,
    "payment_method" VARCHAR(20) NOT NULL,
    "bank_account_id" INTEGER,
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "debt_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "financial_categories" (
    "id" SERIAL NOT NULL,
    "category_code" VARCHAR(50) NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,
    "type" VARCHAR(20) NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "financial_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_balances" (
    "id" SERIAL NOT NULL,
    "warehouse_id" INTEGER,
    "product_id" INTEGER,
    "material_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL DEFAULT 0,
    "last_updated" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_balances_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transaction_details" (
    "id" SERIAL NOT NULL,
    "transaction_id" INTEGER,
    "product_id" INTEGER,
    "material_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2),
    "total_amount" DECIMAL(15,2),
    "notes" TEXT,

    CONSTRAINT "inventory_transaction_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_transactions" (
    "id" SERIAL NOT NULL,
    "transaction_code" VARCHAR(50) NOT NULL,
    "transaction_type" VARCHAR(20) NOT NULL,
    "from_warehouse_id" INTEGER,
    "to_warehouse_id" INTEGER,
    "reference_id" INTEGER,
    "reference_type" VARCHAR(50),
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" INTEGER,
    "approved_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "approved_at" TIMESTAMP(6),
    "completed_at" TIMESTAMP(6),

    CONSTRAINT "inventory_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "materials" (
    "id" SERIAL NOT NULL,
    "material_code" VARCHAR(50) NOT NULL,
    "material_name" VARCHAR(255) NOT NULL,
    "unit" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "branch_id" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "materials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_details" (
    "id" SERIAL NOT NULL,
    "order_id" INTEGER,
    "product_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "cost_price" DECIMAL(15,2),
    "total_amount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "order_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" SERIAL NOT NULL,
    "order_code" VARCHAR(50) NOT NULL,
    "customer_id" INTEGER,
    "branch_id" INTEGER,
    "order_date" DATE NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "discount_amount" DECIMAL(15,2) DEFAULT 0,
    "final_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "production_status" JSONB,
    "deposit_amount" DECIMAL(15,2) DEFAULT 0,
    "paid_amount" DECIMAL(15,2) DEFAULT 0,
    "payment_status" VARCHAR(20) DEFAULT 'UNPAID',

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" SERIAL NOT NULL,
    "permission_code" VARCHAR(100) NOT NULL,
    "permission_name" VARCHAR(255) NOT NULL,
    "module" VARCHAR(100) NOT NULL,
    "description" TEXT,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_categories" (
    "id" SERIAL NOT NULL,
    "category_code" VARCHAR(50) NOT NULL,
    "category_name" VARCHAR(255) NOT NULL,
    "parent_id" INTEGER,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "product_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" SERIAL NOT NULL,
    "product_code" VARCHAR(50) NOT NULL,
    "product_name" VARCHAR(255) NOT NULL,
    "category_id" INTEGER,
    "description" TEXT,
    "unit" VARCHAR(50) NOT NULL,
    "cost_price" DECIMAL(15,2),
    "branch_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_order_details" (
    "id" SERIAL NOT NULL,
    "purchase_order_id" INTEGER,
    "material_id" INTEGER,
    "quantity" DECIMAL(10,3) NOT NULL,
    "unit_price" DECIMAL(15,2) NOT NULL,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "notes" TEXT,
    "item_code" VARCHAR(50),
    "item_name" VARCHAR(255),
    "unit" VARCHAR(50),

    CONSTRAINT "purchase_order_details_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_orders" (
    "id" SERIAL NOT NULL,
    "po_code" VARCHAR(50) NOT NULL,
    "supplier_id" INTEGER,
    "branch_id" INTEGER,
    "order_date" DATE NOT NULL,
    "expected_date" DATE,
    "total_amount" DECIMAL(15,2) NOT NULL,
    "status" VARCHAR(20) DEFAULT 'PENDING',
    "notes" TEXT,
    "created_by" INTEGER,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "deposit_amount" DECIMAL(15,2) DEFAULT 0,
    "paid_amount" DECIMAL(15,2) DEFAULT 0,
    "payment_status" VARCHAR(20) DEFAULT 'UNPAID',

    CONSTRAINT "purchase_orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "id" SERIAL NOT NULL,
    "role_id" INTEGER,
    "permission_id" INTEGER,
    "can_view" BOOLEAN DEFAULT false,
    "can_create" BOOLEAN DEFAULT false,
    "can_edit" BOOLEAN DEFAULT false,
    "can_delete" BOOLEAN DEFAULT false,
    "is_custom" BOOLEAN DEFAULT false,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" SERIAL NOT NULL,
    "role_code" VARCHAR(50) NOT NULL,
    "role_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "level" INTEGER DEFAULT 3,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_groups" (
    "id" SERIAL NOT NULL,
    "group_code" VARCHAR(50) NOT NULL,
    "group_name" VARCHAR(255) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "suppliers" (
    "id" SERIAL NOT NULL,
    "supplier_code" VARCHAR(50) NOT NULL,
    "supplier_name" VARCHAR(255) NOT NULL,
    "phone" VARCHAR(20),
    "email" VARCHAR(255),
    "address" TEXT,
    "supplier_group_id" INTEGER,
    "branch_id" INTEGER,
    "debt_amount" DECIMAL(15,2) DEFAULT 0,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "suppliers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "users" (
    "id" SERIAL NOT NULL,
    "user_code" VARCHAR(20) NOT NULL,
    "username" VARCHAR(100) NOT NULL,
    "password_hash" VARCHAR(255) NOT NULL,
    "full_name" VARCHAR(255) NOT NULL,
    "email" VARCHAR(255),
    "phone" VARCHAR(20),
    "branch_id" INTEGER,
    "role_id" INTEGER,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "warehouses" (
    "id" SERIAL NOT NULL,
    "warehouse_code" VARCHAR(20) NOT NULL,
    "warehouse_name" VARCHAR(255) NOT NULL,
    "branch_id" INTEGER,
    "address" TEXT,
    "is_active" BOOLEAN DEFAULT true,
    "created_at" TIMESTAMP(6) DEFAULT CURRENT_TIMESTAMP,
    "warehouse_type" VARCHAR(20) DEFAULT 'THANH_PHAM',

    CONSTRAINT "warehouses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bom_product_id_material_id_key" ON "bom"("product_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "goods_product_id_material_id_key" ON "goods"("product_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "branches_branch_code_key" ON "branches"("branch_code");

-- CreateIndex
CREATE UNIQUE INDEX "cash_books_transaction_code_key" ON "cash_books"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "customer_groups_group_code_key" ON "customer_groups"("group_code");

-- CreateIndex
CREATE UNIQUE INDEX "customers_customer_code_key" ON "customers"("customer_code");

-- CreateIndex
CREATE INDEX "idx_customers_branch" ON "customers"("branch_id");

-- CreateIndex
CREATE INDEX "idx_customers_group" ON "customers"("customer_group_id");

-- CreateIndex
CREATE UNIQUE INDEX "debt_management_debt_code_key" ON "debt_management"("debt_code");

-- CreateIndex
CREATE UNIQUE INDEX "financial_categories_category_code_key" ON "financial_categories"("category_code");

-- CreateIndex
CREATE INDEX "idx_inventory_material" ON "inventory_balances"("material_id");

-- CreateIndex
CREATE INDEX "idx_inventory_product" ON "inventory_balances"("product_id");

-- CreateIndex
CREATE INDEX "idx_inventory_warehouse" ON "inventory_balances"("warehouse_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_balances_warehouse_id_product_id_material_id_key" ON "inventory_balances"("warehouse_id", "product_id", "material_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_transactions_transaction_code_key" ON "inventory_transactions"("transaction_code");

-- CreateIndex
CREATE UNIQUE INDEX "materials_material_code_key" ON "materials"("material_code");

-- CreateIndex
CREATE UNIQUE INDEX "orders_order_code_key" ON "orders"("order_code");

-- CreateIndex
CREATE INDEX "idx_orders_branch" ON "orders"("branch_id");

-- CreateIndex
CREATE INDEX "idx_orders_customer" ON "orders"("customer_id");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_permission_code_key" ON "permissions"("permission_code");

-- CreateIndex
CREATE UNIQUE INDEX "product_categories_category_code_key" ON "product_categories"("category_code");

-- CreateIndex
CREATE UNIQUE INDEX "products_product_code_key" ON "products"("product_code");

-- CreateIndex
CREATE INDEX "idx_products_branch" ON "products"("branch_id");

-- CreateIndex
CREATE INDEX "idx_products_category" ON "products"("category_id");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_orders_po_code_key" ON "purchase_orders"("po_code");

-- CreateIndex
CREATE UNIQUE INDEX "role_permissions_role_id_permission_id_key" ON "role_permissions"("role_id", "permission_id");

-- CreateIndex
CREATE UNIQUE INDEX "roles_role_code_key" ON "roles"("role_code");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_groups_group_code_key" ON "supplier_groups"("group_code");

-- CreateIndex
CREATE UNIQUE INDEX "suppliers_supplier_code_key" ON "suppliers"("supplier_code");

-- CreateIndex
CREATE INDEX "idx_suppliers_branch" ON "suppliers"("branch_id");

-- CreateIndex
CREATE UNIQUE INDEX "users_user_code_key" ON "users"("user_code");

-- CreateIndex
CREATE UNIQUE INDEX "users_username_key" ON "users"("username");

-- CreateIndex
CREATE INDEX "idx_users_branch" ON "users"("branch_id");

-- CreateIndex
CREATE INDEX "idx_users_role" ON "users"("role_id");

-- CreateIndex
CREATE UNIQUE INDEX "warehouses_warehouse_code_key" ON "warehouses"("warehouse_code");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bom" ADD CONSTRAINT "bom_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "bom" ADD CONSTRAINT "bom_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "goods" ADD CONSTRAINT "goods_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_books" ADD CONSTRAINT "cash_books_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_books" ADD CONSTRAINT "cash_books_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_books" ADD CONSTRAINT "cash_books_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "cash_books" ADD CONSTRAINT "cash_books_financial_category_id_fkey" FOREIGN KEY ("financial_category_id") REFERENCES "financial_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_group_id_fkey" FOREIGN KEY ("customer_group_id") REFERENCES "customer_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debt_management" ADD CONSTRAINT "debt_management_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debt_management" ADD CONSTRAINT "debt_management_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "debt_payments" ADD CONSTRAINT "debt_payments_debt_id_fkey" FOREIGN KEY ("debt_id") REFERENCES "debt_management"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_balances" ADD CONSTRAINT "inventory_balances_warehouse_id_fkey" FOREIGN KEY ("warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transaction_details" ADD CONSTRAINT "inventory_transaction_details_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transaction_details" ADD CONSTRAINT "inventory_transaction_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transaction_details" ADD CONSTRAINT "inventory_transaction_details_transaction_id_fkey" FOREIGN KEY ("transaction_id") REFERENCES "inventory_transactions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_approved_by_fkey" FOREIGN KEY ("approved_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_from_warehouse_id_fkey" FOREIGN KEY ("from_warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventory_transactions" ADD CONSTRAINT "inventory_transactions_to_warehouse_id_fkey" FOREIGN KEY ("to_warehouse_id") REFERENCES "warehouses"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "materials" ADD CONSTRAINT "materials_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "order_details" ADD CONSTRAINT "order_details_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "product_categories" ADD CONSTRAINT "product_categories_parent_id_fkey" FOREIGN KEY ("parent_id") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "products" ADD CONSTRAINT "products_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "product_categories"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_details" ADD CONSTRAINT "purchase_order_details_material_id_fkey" FOREIGN KEY ("material_id") REFERENCES "materials"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_order_details" ADD CONSTRAINT "purchase_order_details_purchase_order_id_fkey" FOREIGN KEY ("purchase_order_id") REFERENCES "purchase_orders"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_created_by_fkey" FOREIGN KEY ("created_by") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "purchase_orders" ADD CONSTRAINT "purchase_orders_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "suppliers" ADD CONSTRAINT "suppliers_supplier_group_id_fkey" FOREIGN KEY ("supplier_group_id") REFERENCES "supplier_groups"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "warehouses" ADD CONSTRAINT "warehouses_branch_id_fkey" FOREIGN KEY ("branch_id") REFERENCES "branches"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;
