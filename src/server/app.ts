import { publicProcedure } from "@/server/core/procedure";
import { router } from "@/server/core/trpc";
import adminRouter from "@/server/routers/admin";
import financeRouter from "@/server/routers/finance";
import blogRouter from "@/server/routers/test";

export const appRouter = router({
    ping: publicProcedure.query(() => 'pong!'),
    test: blogRouter,
    admin: adminRouter,
    finance: financeRouter,
});

export type AppRouter = typeof appRouter;
