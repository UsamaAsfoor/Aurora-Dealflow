import path from "node:path";
import { fileURLToPath } from "node:url";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { postgisSetupSql } from "./schema/index.js";

const migrationsFolder = path.join(
  path.dirname(fileURLToPath(import.meta.url)),
  "../drizzle",
);

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://aurora:aurora@localhost:5432/aurora_dealflow";

async function main() {
  const migrationClient = postgres(connectionString, { max: 1 });
  const db = drizzle(migrationClient);

  try {
    await db.execute(postgisSetupSql);
  } catch (error) {
    console.warn(
      "PostGIS extension unavailable; continuing without spatial features.",
      error,
    );
  }

  console.log("Running migrations...");
  await migrate(db, { migrationsFolder });
  console.log("Migrations complete.");

  await migrationClient.end();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
