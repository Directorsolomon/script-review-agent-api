import { SQLDatabase } from "encore.dev/storage/sqldb";

export const db = new SQLDatabase("script_review", {
  migrations: "./migrations",
});
