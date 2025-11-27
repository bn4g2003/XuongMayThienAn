import { t } from "@/server/core/trpc";

export const timingMiddleware = t.middleware(async ({ next, path, ctx }) => {
    const result = await next();
    return result;
});
