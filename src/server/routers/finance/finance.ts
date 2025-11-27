import { router } from '@/server/core/trpc';
import bankAccountRouter from './bankAccount';
import cashbooksRouter from './cashbooks';
import categoriesRouter from './categories';
import debtManagementRouter from './debtManagement';
import debtOrdersRouter from './debtOrders';
import debtPartnersRouter from './debtPartners';
import debtSummaryRouter from './debtSummary';

const financeRouter = router({
  bankAccounts: bankAccountRouter,
  cashbooks: cashbooksRouter,
  categories: categoriesRouter,
  debts: debtManagementRouter,
  debtOrders: debtOrdersRouter,
  debtPartners: debtPartnersRouter,
  debtSummary: debtSummaryRouter,
});

export default financeRouter;