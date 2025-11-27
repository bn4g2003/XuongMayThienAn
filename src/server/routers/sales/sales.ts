import { router } from '@/server/core/trpc';
import customerGroupsRouter from './customerGroups';
import customersRouter from './customers';
import salesOrdersRouter from './salesOrders';

const salesRouter = router({
  customers: customersRouter,
  customerGroups: customerGroupsRouter,
  orders: salesOrdersRouter,
});

export default salesRouter;