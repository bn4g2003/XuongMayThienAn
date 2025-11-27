import { getCurrentUser } from '@/lib/auth';
import { DatabaseInstance } from '@/lib/db';
import { initTRPC } from '@trpc/server';
import { FetchCreateContextFnOptions, fetchRequestHandler as fetchRequestHandlerRPC } from '@trpc/server/adapters/fetch';
import SuperJSON from 'superjson';

// const MAX_BATCH_SIZE = 100;


const createTRPCContext = async ({
    db,
    ctx,
}: {
    db: DatabaseInstance;
    ctx: FetchCreateContextFnOptions;
}) => {
    const session = await getCurrentUser();
    return {
        db,
        session,
        ctx,
    };
};
export type CreateTRPCContext = ReturnType<typeof createTRPCContext>;

export const t = initTRPC.context<typeof createTRPCContext>().create({
    transformer: SuperJSON,
    isDev: process.env.NEXT_ENV === 'development',
    errorFormatter({ shape }) {
        return shape;
    },
    // sse: {
    //     maxDurationMs: 5 * 60 * 1_000, // 5 minutes
    //     ping: {
    //         enabled: true,
    //         intervalMs: 3_000,
    //     },
    //     client: {
    //         reconnectAfterInactivityMs: 5_000,
    //     },
    // },
});
export type Router = ReturnType<typeof router>;

export const router = t.router;

export const fetchRequestHandler = (opts: {
    req: Request;
    router: Router;
    db: DatabaseInstance;
    endpoint: string;

}) =>
    fetchRequestHandlerRPC({
        req: opts.req,
        router: opts.router,
        endpoint: opts.endpoint,
        createContext: (ctx) =>
            createTRPCContext({ db: opts.db, ctx }),
        onError: ({ error, path, input }) => {
            console.error('TRPC Error', { error, path, input });
        },
    });
