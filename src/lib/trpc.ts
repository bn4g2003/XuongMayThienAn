import { AppRouter } from '@/server/app';
import { defaultShouldDehydrateQuery, QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: process.env.NEXT_ENV === 'production' ? 1000 * 60 * 5 : 0, // 5 minutes in production, no stale time in development
        },
        dehydrate: {
            serializeData: superjson.serialize,
            shouldDehydrateQuery: (query) => defaultShouldDehydrateQuery(query) || query.state.status === 'pending',
        },
        hydrate: {
            deserializeData: superjson.deserialize,
        },
    },
});

const trpcClient = createTRPCClient<AppRouter>({
    links: [httpBatchLink({ url: `api/trpc`, transformer: superjson })],
});
export const trpc = createTRPCOptionsProxy<AppRouter>({
    client: trpcClient,
    queryClient,
});
