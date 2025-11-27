import { Prisma, PrismaClient } from '@/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { withAccelerate } from '@prisma/extension-accelerate';

const env = process.env.NEXT_ENV || 'development';
const isDev = env === 'development';

let _db: PrismaClient | null = null;
const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
})



function getDb() {
    if (!_db) {
        const opts: Record<string, unknown> = {
            adapter
        };
        if (isDev) {
            opts.log = [{ emit: 'event', level: 'query' }];
        }
        if (process.env.PRISMA_ACCELERATE_URL) {
            // only pass accelerateUrl when provided (avoid empty-string validation error)
            opts.accelerateUrl = process.env.PRISMA_ACCELERATE_URL;
        }

        // cast to any to avoid strict constructor typing from generated client
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const prisma = new PrismaClient(opts as any);

        prisma.$extends(withAccelerate());
        _db = prisma;
    }

    return _db;
}

export const db = getDb();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function query<T = unknown>(sql: string, params: unknown[] = []): Promise<any> {
    // Split the SQL by $1, $2, ... placeholders and build Prisma.sql
    const parts = sql.split(/\$\d+/g);
    const prismaSql = Prisma.sql([parts[0], ...parts.slice(1)], ...(params as unknown[]));

    // db.$queryRaw returns an array of rows; wrap to mimic `pg`'s QueryResult shape

    return db.$queryRaw(prismaSql)
}

type DatabaseInstance = typeof db;
export type { DatabaseInstance };
