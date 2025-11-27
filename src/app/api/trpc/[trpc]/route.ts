import { db } from "@/lib/db";
import { appRouter } from "@/server/app";
import { fetchRequestHandler } from "@/server/core/trpc";

const handler = (req: Request) => {
    return fetchRequestHandler({ req, endpoint: '/api/trpc', router: appRouter, db });
};

export const GET = async (req: Request) => {
    return handler(req);
};
export const POST = async (req: Request) => {
    return handler(req);
};
