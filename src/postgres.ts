import { Pool } from 'pg';
import { config } from '@/config-manager';
import { logger } from '@/logger';
import { migrations } from '@/migrations';
import type { PoolClient, QueryResultRow } from 'pg';

// A pool or a transaction client: both take queries.
export interface Queryable {
	query: <R extends QueryResultRow = any>(text: string, params?: unknown[]) => Promise<{ rows: R[]; rowCount: number | null }>;
}

let pool: Pool | null = null;

export function db(): Pool {
	if (!pool) {
		throw new Error('Cannot make database requests without being connected');
	}
	return pool;
}

export async function connectPostgres(): Promise<void> {
	pool = new Pool({ connectionString: config.postgres.url, max: 10 });
	pool.on('error', (error: Error) => logger.error(`postgres pool: ${error.message}`));
	await migrate(pool);
}

// Additive migrations from src/migrations.ts, each applied once and recorded in boss_migrations.
async function migrate(p: Pool): Promise<void> {
	await p.query('CREATE TABLE IF NOT EXISTS boss_migrations (name text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now())');
	for (const m of migrations) {
		const done = await p.query('SELECT 1 FROM boss_migrations WHERE name = $1', [m.name]);
		if (done.rowCount) {
			continue;
		}
		await withTransaction(async (tx) => {
			await tx.query(m.sql);
			await tx.query('INSERT INTO boss_migrations (name) VALUES ($1)', [m.name]);
		});
		logger.info(`Applied migration ${m.name}`);
	}
}

export async function withTransaction<T>(fn: (tx: PoolClient) => Promise<T>): Promise<T> {
	const client = await db().connect();
	try {
		await client.query('BEGIN');
		const result = await fn(client);
		await client.query('COMMIT');
		return result;
	} catch (error) {
		await client.query('ROLLBACK');
		throw error;
	} finally {
		client.release();
	}
}
