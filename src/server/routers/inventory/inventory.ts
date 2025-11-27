import { router } from '@/server/core/trpc';
import branchesRouter from './branches';
import inventoryBalanceRouter from './inventoryBalance';
import inventoryExportRouter from './inventoryExport';
import inventoryHistoryRouter from './inventoryHistory';
import inventoryImportRouter from './inventoryImport';
import inventoryTransferRouter from './inventoryTransfer';
import warehousesRouter from './warehouses';

const inventoryRouter = router({
  branches: branchesRouter,
  warehouses: warehousesRouter,
  balance: inventoryBalanceRouter,
  history: inventoryHistoryRouter,
  transfer: inventoryTransferRouter,
  import: inventoryImportRouter,
  export: inventoryExportRouter,
});

export default inventoryRouter;