/**
 * Side-effect prelude for the headless CLI — MUST be the first import.
 *
 * The Nest ConfigModule validates the env schema at module-import time, and it
 * hard-requires DB/JWT settings the headless process never uses. Fill safe
 * placeholders when absent so the CLI runs on a bare checkout (offline eval,
 * CI worktrees) without an .env file.
 */
if (!process.env.DATABASE_URL) {
  process.env.DATABASE_URL = 'postgresql://headless:headless@localhost:5432/headless';
}
const filler = 'headless-cli-does-not-use-jwt-0000000000000000000000000000000000000000';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = filler;
if (!process.env.JWT_REFRESH_SECRET) process.env.JWT_REFRESH_SECRET = filler;

export {};
