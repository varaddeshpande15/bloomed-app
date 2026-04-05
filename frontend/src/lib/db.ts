import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

declare global {
  var db: ReturnType<typeof drizzle<typeof schema>> | undefined;
}

function createDrizzleClient() {
  const connectionString = process.env.DATABASE_URL?.trim();
  if (!connectionString) {
    throw new Error(
      "DATABASE_URL is missing. Add it to .env.local in the project root and restart the dev server (not only hot reload).",
    );
  }

  const needsSsl =
    connectionString.includes("supabase.com") ||
    connectionString.includes("sslmode=require");

  const client = postgres(connectionString, {
    ...(needsSsl ? { ssl: "require" as const } : {}),
    max: 10,
  });
  return drizzle(client, { schema });
}

export const db = globalThis.db || createDrizzleClient();

if (process.env.NODE_ENV !== "production") globalThis.db = db;
