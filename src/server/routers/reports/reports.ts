import { router } from '@/server/core/trpc';
import customerReportsRouter from '../sales/customerReports';
import debtReportsRouter from './debtReports';
import debtsRouter from './debts';
import purchasingReportsRouter from '../purchasing/purchasingReports';
import revenueReportsRouter from './revenueReports';

const reportsRouter = router({
  debts: debtsRouter,
  debtReports: debtReportsRouter,
  customers: customerReportsRouter,
  purchasing: purchasingReportsRouter,
  revenue: revenueReportsRouter,
});

export default reportsRouter;