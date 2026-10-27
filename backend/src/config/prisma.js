import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

export const banco = new PrismaClient({
  adapter: new PrismaPg(
    { connectionString: process.env.DATABASE_URL },
    {
      schema:
        new URL(process.env.DATABASE_URL).searchParams.get("schema") ??
        "public",
    },
  ),
});
