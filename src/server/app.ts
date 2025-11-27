import { publicProcedure } from "@/server/core/procedure";
import { router } from "@/server/core/trpc";
import adminRouter from "@/server/routers/admin";
import authRouter from "@/server/routers/auth";
import financeRouter from "@/server/routers/finance";
import inventoryRouter from "@/server/routers/inventory";
import productsRouter from "@/server/routers/products";
import purchasingRouter from "@/server/routers/purchasing";
import reportsRouter from "@/server/routers/reports";
import salesRouter from "@/server/routers/sales";

export const appRouter = router({
    ping: publicProcedure.query(() => 'pong!'),
    admin: adminRouter,
    auth: authRouter,
    finance: financeRouter,
    inventory: inventoryRouter,
    products: productsRouter,
    purchasing: purchasingRouter,
    reports: reportsRouter,
    sales: salesRouter,
});

export type AppRouter = typeof appRouter;
