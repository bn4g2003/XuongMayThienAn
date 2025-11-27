import { router } from '@/server/core/trpc';
import purchaseOrdersRouter from './purchaseOrders';
import supplierGroupsRouter from './supplierGroups';
import suppliersRouter from './suppliers';

const purchasingRouter = router({
  suppliers: suppliersRouter,
  supplierGroups: supplierGroupsRouter,
  orders: purchaseOrdersRouter,
});

export default purchasingRouter;