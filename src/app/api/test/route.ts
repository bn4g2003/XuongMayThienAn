import { db } from "@/lib/db";
import { NextResponse } from "next/server";

export const GET = async () => {
     const branches = await db.branches.findMany({
          select: {
            id: true,
            branch_code: true,
            branch_name: true,
            address: true,
            phone: true,
            email: true,
            is_active: true,
            created_at: true,
          },
          orderBy: { id: 'asc' },
        });
  return NextResponse.json({ message: 'Test API is working!' , data: branches });
}
