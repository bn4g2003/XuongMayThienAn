import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getDebtsSchema = z.object({
  debtType: z.enum(['RECEIVABLE', 'PAYABLE']).optional(),
  status: z.enum(['PENDING', 'PARTIAL', 'PAID', 'OVERDUE']).optional(),
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
});

const createDebtSchema = z.object({
  debtCode: z.string().min(1),
  customerId: z.number().int().positive().optional(),
  supplierId: z.number().int().positive().optional(),
  debtType: z.enum(['RECEIVABLE', 'PAYABLE']),
  originalAmount: z.number().positive(),
  dueDate: z.string().optional(),
  referenceId: z.number().int().positive().optional(),
  referenceType: z.string().optional(),
  notes: z.string().optional(),
});

const getPaymentsSchema = z.object({
  debtId: z.number().int().positive(),
});

const createPaymentSchema = z.object({
  debtId: z.number().int().positive(),
  paymentAmount: z.number().positive(),
  paymentDate: z.string(),
  paymentMethod: z.string().min(1),
  bankAccountId: z.number().int().positive().optional(),
  notes: z.string().optional(),
});

const debtManagementRouter = router({
  getAll: protectedProcedure
    .input(getDebtsSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.debts', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem công nợ');
      }

      const { debtType, status, customerId, supplierId } = input;

      // Build where clause dynamically
      const where: {
        debt_type?: string;
        status?: string;
        customer_id?: number;
        supplier_id?: number;
      } = {};

      if (debtType) {
        where.debt_type = debtType;
      }

      if (status) {
        where.status = status;
      }

      if (customerId) {
        where.customer_id = customerId;
      }

      if (supplierId) {
        where.supplier_id = supplierId;
      }

      const debts = await db.debt_management.findMany({
        where,
        include: {
          customers: {
            select: {
              customer_name: true,
              customer_code: true,
              phone: true
            }
          },
          suppliers: {
            select: {
              supplier_name: true,
              supplier_code: true,
              phone: true
            }
          }
        },
        orderBy: [
          { due_date: 'asc' },
          { created_at: 'desc' }
        ]
      });

      // Transform the result to match the original API response format
      const transformedResult = debts.map(debt => ({
        id: debt.id,
        debtCode: debt.debt_code,
        debtType: debt.debt_type,
        originalAmount: Number(debt.original_amount),
        paidAmount: Number(debt.paid_amount),
        remainingAmount: Number(debt.remaining_amount),
        dueDate: debt.due_date,
        status: debt.status,
        referenceType: debt.reference_type,
        referenceId: debt.reference_id,
        notes: debt.notes,
        customerName: debt.customers?.customer_name,
        customerCode: debt.customers?.customer_code,
        customerPhone: debt.customers?.phone,
        supplierName: debt.suppliers?.supplier_name,
        supplierCode: debt.suppliers?.supplier_code,
        supplierPhone: debt.suppliers?.phone,
        createdAt: debt.created_at,
        updatedAt: debt.updated_at
      }));

      return transformedResult;
    }),

  create: protectedProcedure
    .input(createDebtSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.debts', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo công nợ');
      }

      const {
        debtCode,
        customerId,
        supplierId,
        debtType,
        originalAmount,
        dueDate,
        referenceId,
        referenceType,
        notes,
      } = input;

      // Kiểm tra phải có customer hoặc supplier
      if (debtType === 'RECEIVABLE' && !customerId) {
        throw new Error('Công nợ phải thu phải có khách hàng');
      }

      if (debtType === 'PAYABLE' && !supplierId) {
        throw new Error('Công nợ phải trả phải có nhà cung cấp');
      }

      try {
        const result = await db.$transaction(async (tx) => {
          // Create the debt record
          const debt = await tx.debt_management.create({
            data: {
              debt_code: debtCode,
              customer_id: customerId || null,
              supplier_id: supplierId || null,
              debt_type: debtType,
              original_amount: originalAmount,
              remaining_amount: originalAmount,
              due_date: dueDate ? new Date(dueDate) : null,
              reference_id: referenceId || null,
              reference_type: referenceType || null,
              notes: notes || null
            },
            select: {
              id: true,
              debt_code: true,
              debt_type: true,
              original_amount: true,
              remaining_amount: true,
              due_date: true,
              status: true,
              created_at: true
            }
          });

          // Update debt_amount for customer or supplier
          if (customerId) {
            await tx.customers.update({
              where: { id: customerId },
              data: {
                debt_amount: {
                  increment: originalAmount
                }
              }
            });
          }

          if (supplierId) {
            await tx.suppliers.update({
              where: { id: supplierId },
              data: {
                debt_amount: {
                  increment: originalAmount
                }
              }
            });
          }

          return debt;
        });

        // Transform the result to match the original API response format
        const transformedResult = {
          id: result.id,
          debtCode: result.debt_code,
          debtType: result.debt_type,
          originalAmount: Number(result.original_amount),
          remainingAmount: Number(result.remaining_amount),
          dueDate: result.due_date,
          status: result.status,
          createdAt: result.created_at
        };

        return transformedResult;
      } catch (err: unknown) {
        console.error('Create debt error:', err);
        const error = err as { code?: string };
        if (error.code === 'P2002') {
          throw new Error('Mã công nợ đã tồn tại');
        }
        throw new Error('Lỗi server khi tạo công nợ');
      }
    }),

  getPayments: protectedProcedure
    .input(getPaymentsSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.debts', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem công nợ');
      }

      const { debtId } = input;

      const payments = await db.debt_payments.findMany({
        where: { debt_id: debtId },
        include: {
          bank_accounts: true,
          users: true
        },
        orderBy: [
          { payment_date: 'desc' },
          { created_at: 'desc' }
        ]
      });

      const data = payments.map(payment => ({
        id: payment.id,
        paymentAmount: payment.payment_amount,
        paymentDate: payment.payment_date,
        paymentMethod: payment.payment_method,
        notes: payment.notes,
        bankAccountNumber: payment.bank_accounts?.account_number,
        bankName: payment.bank_accounts?.bank_name,
        createdByName: payment.users?.full_name,
        createdAt: payment.created_at
      }));

      return data;
    }),

  createPayment: protectedProcedure
    .input(createPaymentSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user, error } = await requirePermission('finance.debts', 'edit');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền thanh toán công nợ');
      }

      const { debtId, paymentAmount, paymentDate, paymentMethod, bankAccountId, notes } = input;

      // Lấy thông tin công nợ
      const debt = await db.debt_management.findUnique({
        where: { id: debtId },
        select: {
          remaining_amount: true,
          customer_id: true,
          supplier_id: true,
          debt_type: true
        }
      });

      if (!debt) {
        throw new Error('Không tìm thấy công nợ');
      }

      if (paymentAmount > Number(debt.remaining_amount)) {
        throw new Error('Số tiền thanh toán vượt quá công nợ còn lại');
      }

      try {
        // Use transaction for all operations
        const result = await db.$transaction(async (tx) => {
          // Thêm thanh toán
          const newPayment = await tx.debt_payments.create({
            data: {
              debt_id: debtId,
              payment_amount: paymentAmount,
              payment_date: new Date(paymentDate),
              payment_method: paymentMethod,
              bank_account_id: bankAccountId || null,
              notes,
              created_by: user.id
            },
            select: {
              id: true,
              payment_amount: true,
              payment_date: true,
              payment_method: true,
              created_at: true
            }
          });

          // Cập nhật remaining_amount
          const newRemaining = Number(debt.remaining_amount) - paymentAmount;
          let newStatus = 'PARTIAL';

          if (newRemaining === 0) {
            newStatus = 'PAID';
          } else if (newRemaining === Number(debt.remaining_amount)) {
            newStatus = 'PENDING';
          }

          await tx.debt_management.update({
            where: { id: debtId },
            data: {
              remaining_amount: newRemaining,
              status: newStatus,
              updated_at: new Date()
            }
          });

          // Cập nhật debt_amount của customer hoặc supplier
          if (debt.customer_id) {
            await tx.customers.update({
              where: { id: debt.customer_id },
              data: {
                debt_amount: {
                  decrement: paymentAmount
                }
              }
            });
          }

          if (debt.supplier_id) {
            await tx.suppliers.update({
              where: { id: debt.supplier_id },
              data: {
                debt_amount: {
                  decrement: paymentAmount
                }
              }
            });
          }

          // Cập nhật số dư tài khoản ngân hàng nếu có
          if (bankAccountId) {
            const balanceChange = debt.debt_type === 'RECEIVABLE' ? paymentAmount : -paymentAmount;
            await tx.bank_accounts.update({
              where: { id: bankAccountId },
              data: {
                balance: {
                  increment: balanceChange
                }
              }
            });
          }

          return newPayment;
        });

        const data = {
          id: result.id,
          paymentAmount: result.payment_amount,
          paymentDate: result.payment_date,
          paymentMethod: result.payment_method,
          createdAt: result.created_at
        };

        return data;
      } catch (err: unknown) {
        console.error('Create payment error:', err);
        throw new Error('Lỗi server khi tạo thanh toán');
      }
    }),
});

export default debtManagementRouter;