import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url = process.env.DATABASE_URL;
if (!url) {
  throw new Error("DATABASE_URL must be set (e.g. in .env)");
}

const globalForDb = globalThis as unknown as {
  conn?: ReturnType<typeof postgres>;
};

const conn = globalForDb.conn ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") {
  globalForDb.conn = conn;
}

export const db = drizzle(conn, { schema });
export * from "./schema";
