import { timingMiddleware } from '@/server/core/middwares';
import { t } from '@/server/core/trpc';
import { TRPCError } from '@trpc/server';

export const publicProcedure = t.procedure.use(timingMiddleware);

export const protectedProcedure = publicProcedure.use(({ ctx, next }) => {
    if (!ctx.session) {
        throw new TRPCError({ code: 'FORBIDDEN' });
    }

    return next({
        ctx: {
            session: ctx.session,
        },
    });
});
