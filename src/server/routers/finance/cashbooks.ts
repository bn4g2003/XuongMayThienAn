import { db } from '@/lib/db';
import { protectedProcedure } from '@/server/core/procedure';
import { router } from '@/server/core/trpc';
import { requirePermission } from '@/server/services/permissions';
import { z } from 'zod';

// Define input schemas
const getCashBooksSchema = z.object({
  transactionType: z.enum(['THU', 'CHI']).optional(),
  paymentMethod: z.enum(['CASH', 'BANK', 'TRANSFER']).optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
  branchId: z.number().int().positive().optional(),
});

const createCashBookSchema = z.object({
  transactionCode: z.string().min(1),
  transactionDate: z.string(), // ISO date string
  financialCategoryId: z.number().int().positive(),
  amount: z.number().positive(),
  transactionType: z.enum(['THU', 'CHI']),
  paymentMethod: z.enum(['CASH', 'BANK', 'TRANSFER']),
  bankAccountId: z.number().int().positive().optional(),
  referenceId: z.number().int().positive().optional(),
  referenceType: z.string().optional(),
  description: z.string().optional(),
  branchId: z.number().int().positive().optional(),
});

const cashbooksRouter = router({
  getAll: protectedProcedure
    .input(getCashBooksSchema)
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('finance.cashbooks', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem sổ quỹ');
      }

      const { transactionType, paymentMethod, startDate, endDate, branchId } = input;

      const whereClause: {
        branch_id?: number;
        transaction_type?: string;
        payment_method?: string;
        transaction_date?: {
          gte?: Date;
          lte?: Date;
        };
      } = {};

      // Filter by branch
      if (currentUser?.roleCode !== 'ADMIN') {
        whereClause.branch_id = currentUser?.branchId;
      } else if (branchId) {
        whereClause.branch_id = branchId;
      }

      if (transactionType) {
        whereClause.transaction_type = transactionType;
      }

      if (paymentMethod) {
        whereClause.payment_method = paymentMethod;
      }

      if (startDate) {
        whereClause.transaction_date = {
          ...whereClause.transaction_date,
          gte: new Date(startDate),
        };
      }

      if (endDate) {
        whereClause.transaction_date = {
          ...whereClause.transaction_date,
          lte: new Date(endDate),
        };
      }

      const cashBooks = await db.cash_books.findMany({
        where: whereClause,
        include: {
          financial_categories: {
            select: {
              category_name: true,
              category_code: true,
            },
          },
          bank_accounts: {
            select: {
              account_number: true,
              bank_name: true,
            },
          },
          users: {
            select: {
              full_name: true,
            },
          },
          branches: {
            select: {
              branch_name: true,
            },
          },
        },
        orderBy: [
          { transaction_date: 'desc' },
          { created_at: 'desc' },
        ],
      });

      return cashBooks.map((cb) => ({
        id: cb.id,
        transactionCode: cb.transaction_code,
        transactionDate: cb.transaction_date,
        amount: cb.amount,
        transactionType: cb.transaction_type,
        paymentMethod: cb.payment_method,
        description: cb.description,
        referenceType: cb.reference_type,
        referenceId: cb.reference_id,
        categoryId: cb.financial_category_id,
        bankAccountId: cb.bank_account_id,
        categoryName: cb.financial_categories?.category_name,
        categoryCode: cb.financial_categories?.category_code,
        bankAccountNumber: cb.bank_accounts?.account_number,
        bankName: cb.bank_accounts?.bank_name,
        createdByName: cb.users?.full_name,
        branchName: cb.branches?.branch_name,
        createdAt: cb.created_at,
      }));
    }),

  create: protectedProcedure
    .input(createCashBookSchema)
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, user: currentUser, error } = await requirePermission('finance.cashbooks', 'create');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền tạo phiếu thu/chi');
      }

      const {
        transactionCode,
        transactionDate,
        financialCategoryId,
        amount,
        transactionType,
        paymentMethod,
        bankAccountId,
        referenceId,
        referenceType,
        description,
        branchId,
      } = input;

      // Validate bank account requirement
      if ((paymentMethod === 'BANK' || paymentMethod === 'TRANSFER') && !bankAccountId) {
        throw new Error('Phải chọn tài khoản ngân hàng cho phương thức thanh toán này');
      }

      const finalBranchId = currentUser?.roleCode === 'ADMIN' ? branchId : currentUser?.branchId;

      if (!finalBranchId) {
        throw new Error('Thiếu thông tin chi nhánh');
      }

      try {
        const newCashBook = await db.cash_books.create({
          data: {
            transaction_code: transactionCode,
            transaction_date: new Date(transactionDate),
            financial_category_id: financialCategoryId,
            amount,
            transaction_type: transactionType,
            payment_method: paymentMethod,
            bank_account_id: bankAccountId,
            reference_id: referenceId,
            reference_type: referenceType,
            description,
            created_by: currentUser?.id,
            branch_id: finalBranchId,
          },
          select: {
            id: true,
            transaction_code: true,
            transaction_date: true,
            amount: true,
            transaction_type: true,
            payment_method: true,
            description: true,
            created_at: true,
          },
        });

        // Update bank account balance if applicable
        if (bankAccountId) {
          const balanceChange = transactionType === 'THU' ? amount : -amount;
          await db.bank_accounts.update({
            where: { id: bankAccountId },
            data: {
              balance: {
                increment: balanceChange,
              },
            },
          });
        }

        return {
          id: newCashBook.id,
          transactionCode: newCashBook.transaction_code,
          transactionDate: newCashBook.transaction_date,
          amount: newCashBook.amount,
          transactionType: newCashBook.transaction_type,
          paymentMethod: newCashBook.payment_method,
          description: newCashBook.description,
          createdAt: newCashBook.created_at,
        };
      } catch (err: unknown) {
        if (err instanceof Error && 'code' in err && err.code === 'P2002') {
          throw new Error('Mã giao dịch đã tồn tại');
        }
        console.error('Create cash book error:', err);
        throw new Error('Lỗi server khi tạo phiếu thu/chi');
      }
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .mutation(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.cashbooks', 'delete');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xóa phiếu thu/chi');
      }

      // Get cash book info before deleting
      const cashbook = await db.cash_books.findUnique({
        where: { id: input.id },
        select: {
          transaction_type: true,
          amount: true,
          bank_account_id: true,
        },
      });

      if (!cashbook) {
        throw new Error('Không tìm thấy phiếu thu/chi');
      }

      // Delete the cash book
      await db.cash_books.delete({
        where: { id: input.id },
      });

      // Reverse the balance if bank account exists
      if (cashbook.bank_account_id) {
        const balanceChange = cashbook.transaction_type === 'THU' ? -cashbook.amount : cashbook.amount;
        await db.bank_accounts.update({
          where: { id: cashbook.bank_account_id },
          data: {
            balance: {
              increment: balanceChange,
            },
          },
        });
      }

      return {
        message: 'Xóa phiếu thu/chi thành công',
      };
    }),

  generatePdf: protectedProcedure
    .input(z.object({ id: z.number().int().positive() }))
    .query(async ({ input }) => {
      // Permission check
      const { hasPermission, error } = await requirePermission('finance.cashbooks', 'view');
      if (!hasPermission) {
        throw new Error(error || 'Không có quyền xem phiếu thu/chi');
      }

      // Fetch cash book data
      const cashbook = await db.cash_books.findUnique({
        where: { id: input.id },
        include: {
          financial_categories: {
            select: {
              category_name: true,
              category_code: true,
            },
          },
          bank_accounts: {
            select: {
              account_number: true,
              bank_name: true,
              branch_name: true,
            },
          },
          users: {
            select: {
              full_name: true,
            },
          },
          branches: {
            select: {
              branch_name: true,
              address: true,
              phone: true,
            },
          },
        },
      });

      if (!cashbook) {
        throw new Error('Không tìm thấy phiếu thu/chi');
      }

      // Fetch company config
      const companyConfig = await db.$queryRawUnsafe(`
        SELECT company_name, tax_code, address, phone, email
        FROM company_config
        LIMIT 1
      `) as Array<{ company_name?: string; tax_code?: string; address?: string; phone?: string; email?: string }>;
      const company = companyConfig[0] || {};

      const isReceipt = cashbook.transaction_type === 'THU';
      const title = isReceipt ? 'PHIẾU THU' : 'PHIẾU CHI';
      const personLabel = isReceipt ? 'Người nộp tiền' : 'Người nhận tiền';
      const reasonLabel = isReceipt ? 'Lý do thu' : 'Lý do chi';

      const paymentMethodMap: Record<string, string> = {
        'CASH': 'Tiền mặt',
        'BANK': 'Ngân hàng',
        'TRANSFER': 'Chuyển khoản',
      };

      // Generate HTML
      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Times New Roman', Times, serif; padding: 40px; }
    .header { text-align: center; margin-bottom: 30px; }
    .company-name { font-size: 20px; font-weight: bold; margin-bottom: 5px; }
    .company-info { font-size: 12px; color: #666; line-height: 1.6; }
    .title { font-size: 24px; font-weight: bold; text-align: center; margin: 30px 0 10px 0; text-transform: uppercase; }
    .receipt-code { text-align: center; font-size: 14px; margin-bottom: 5px; }
    .receipt-date { text-align: center; font-size: 14px; margin-bottom: 30px; font-style: italic; }
    .content { margin: 30px 0; }
    .row { display: flex; margin-bottom: 15px; font-size: 15px; line-height: 1.8; }
    .row-label { width: 180px; }
    .row-value { flex: 1; border-bottom: 1px dotted #666; min-height: 24px; }
    .row-value.no-border { border-bottom: none; }
    .amount-row { margin: 20px 0; padding: 15px; background-color: #f9fafb; border: 2px solid #000; }
    .amount-label { font-size: 15px; margin-bottom: 8px; }
    .amount-value { font-size: 22px; font-weight: bold; color: #1e40af; }
    .amount-words { font-size: 14px; font-style: italic; margin-top: 8px; color: #666; }
    .signature-section { margin-top: 60px; display: flex; justify-content: space-around; }
    .signature-box { text-align: center; width: 180px; }
    .signature-title { font-weight: bold; margin-bottom: 10px; font-size: 14px; }
    .signature-subtitle { font-size: 12px; font-style: italic; color: #666; margin-bottom: 50px; }
    .signature-name { font-size: 14px; }
    .footer { margin-top: 40px; text-align: right; font-size: 12px; color: #666; }
    @media print {
      body { padding: 20px; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div class="company-name">${company.company_name || 'CÔNG TY'}</div>
    <div class="company-info">
      ${company.address ? `${company.address}<br>` : ''}
      ${company.phone ? `ĐT: ${company.phone}` : ''} ${company.email ? `| Email: ${company.email}` : ''}
      ${company.tax_code ? `<br>MST: ${company.tax_code}` : ''}
    </div>
  </div>

  <div class="title">${title}</div>
  <div class="receipt-code">Số: <strong>${cashbook.transaction_code}</strong></div>
  <div class="receipt-date">Ngày ${cashbook.transaction_date.getDate()} tháng ${cashbook.transaction_date.getMonth() + 1} năm ${cashbook.transaction_date.getFullYear()}</div>

  <div class="content">
    <div class="row">
      <div class="row-label">${personLabel}:</div>
      <div class="row-value"></div>
    </div>

    <div class="row">
      <div class="row-label">${reasonLabel}:</div>
      <div class="row-value no-border"><strong>${cashbook.financial_categories?.category_name}</strong></div>
    </div>

    ${cashbook.description ? `
    <div class="row">
      <div class="row-label">Diễn giải:</div>
      <div class="row-value no-border">${cashbook.description}</div>
    </div>` : ''}

    <div class="amount-row">
      <div class="amount-label">Số tiền:</div>
      <div class="amount-value">${Math.floor(Number(cashbook.amount)).toLocaleString('vi-VN')} đồng</div>
      <div class="amount-words" id="amount-words"></div>
    </div>

    <div class="row">
      <div class="row-label">Phương thức thanh toán:</div>
      <div class="row-value no-border"><strong>${paymentMethodMap[cashbook.payment_method] || cashbook.payment_method}</strong></div>
    </div>

    ${cashbook.bank_accounts ? `
    <div class="row">
      <div class="row-label">Tài khoản ngân hàng:</div>
      <div class="row-value no-border">${cashbook.bank_accounts.bank_name} - ${cashbook.bank_accounts.account_number}</div>
    </div>
    ${cashbook.bank_accounts.branch_name ? `
    <div class="row">
      <div class="row-label">Chi nhánh ngân hàng:</div>
      <div class="row-value no-border">${cashbook.bank_accounts.branch_name}</div>
    </div>` : ''}
    ` : ''}

    <div class="row">
      <div class="row-label">Chi nhánh:</div>
      <div class="row-value no-border">${cashbook.branches?.branch_name}</div>
    </div>
  </div>

  <div class="signature-section">
    <div class="signature-box">
      <div class="signature-title">Người lập phiếu</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name">${cashbook.users?.full_name}</div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Kế toán</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
    <div class="signature-box">
      <div class="signature-title">Thủ quỹ</div>
      <div class="signature-subtitle">(Ký, ghi rõ họ tên)</div>
      <div class="signature-name"></div>
    </div>
  </div>

  <div class="footer">
    In lúc: ${new Date().toLocaleString('vi-VN')}
  </div>

  <script>
    function numberToVietnameseWords(num) {
      if (num === 0) return 'Không đồng';

      const ones = ['', 'một', 'hai', 'ba', 'bốn', 'năm', 'sáu', 'bảy', 'tám', 'chín'];
      const teens = ['mười', 'mười một', 'mười hai', 'mười ba', 'mười bốn', 'mười lăm', 'mười sáu', 'mười bảy', 'mười tám', 'mười chín'];
      const tens = ['', '', 'hai mươi', 'ba mươi', 'bốn mươi', 'năm mươi', 'sáu mươi', 'bảy mươi', 'tám mươi', 'chín mươi'];
      const thousands = ['', 'nghìn', 'triệu', 'tỷ'];

      function convertThreeDigits(n) {
        let result = '';
        const hundred = Math.floor(n / 100);
        const remainder = n % 100;

        if (hundred > 0) {
          result += ones[hundred] + ' trăm';
          if (remainder > 0) result += ' ';
        }

        if (remainder >= 10 && remainder < 20) {
          result += teens[remainder - 10];
        } else {
          const ten = Math.floor(remainder / 10);
          const one = remainder % 10;

          if (ten > 0) {
            result += tens[ten];
            if (one > 0) result += ' ';
          }

          if (one > 0) {
            if (ten > 1 && one === 1) {
              result += 'mốt';
            } else if (ten > 0 && one === 5) {
              result += 'lăm';
            } else {
              result += ones[one];
            }
          }
        }

        return result;
      }

      let result = '';
      let unitIndex = 0;

      while (num > 0) {
        const threeDigits = num % 1000;
        if (threeDigits > 0) {
          const converted = convertThreeDigits(threeDigits);
          result = converted + (thousands[unitIndex] ? ' ' + thousands[unitIndex] : '') + (result ? ' ' + result : '');
        }
        num = Math.floor(num / 1000);
        unitIndex++;
      }

      return result.charAt(0).toUpperCase() + result.slice(1) + ' đồng';
    }

    window.onload = function() {
      const amountWords = numberToVietnameseWords(${Math.floor(Number(cashbook.amount))});
      document.getElementById('amount-words').textContent = '(Bằng chữ: ' + amountWords + ')';
      window.print();
    }
  </script>
</body>
</html>
      `;

      return html;
    }),
});

export default cashbooksRouter;
