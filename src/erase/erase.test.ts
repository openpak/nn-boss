import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { Pool } from 'pg';
import { migrations } from '@/migrations';
import { eraseByPids } from '@/erase/store';
import { eraseAccount, eraseHandler } from '@/erase/core';
import type { AddressInfo } from 'node:net';

const ACCT = '11111111-2222-3333-4444-555555555555';

test('no pids is zero rows, logged once per run', async () => {
	let logged = 0;
	for (let i = 0; i < 2; i++) {
		const rows = await eraseAccount(ACCT, {
			resolvePids: async () => [],
			eraseByPids: async () => {
				throw new Error('must not run');
			},
			log: () => {
				logged++;
			}
		});
		assert.equal(rows, 0);
	}
	assert.equal(logged, 2);
});

test('a failed pid lookup fails the erasure', async () => {
	await assert.rejects(eraseAccount(ACCT, {
		resolvePids: async () => {
			throw new Error('down');
		},
		eraseByPids: async () => 0,
		log: () => {}
	}));
});

async function request(port: number, id: string, auth?: string): Promise<{ status: number; body: string }> {
	return new Promise((resolve, reject) => {
		const req = http.request({ port, method: 'DELETE', path: `/internal/accounts/${id}/data`, headers: auth ? { Authorization: auth } : {} }, (res) => {
			let body = '';
			res.on('data', (c) => {
				body += c;
			});
			res.on('end', () => resolve({ status: res.statusCode ?? 0, body }));
		});
		req.on('error', reject);
		req.end();
	});
}

test('handler auth', async () => {
	let ran = 0;
	const serve = async (key: string): Promise<{ server: http.Server; port: number }> => {
		const server = http.createServer(eraseHandler(key, async () => {
			ran++;
			return 3;
		}));
		await new Promise<void>(r => server.listen(0, '127.0.0.1', r));
		return { server, port: (server.address() as AddressInfo).port };
	};
	const open = await serve('');
	assert.equal((await request(open.port, ACCT, 'Bearer k')).status, 503);
	open.server.close();

	const s = await serve('k');
	assert.equal((await request(s.port, ACCT)).status, 401);
	assert.equal((await request(s.port, ACCT, 'Bearer nope')).status, 401);
	assert.equal((await request(s.port, 'not-a-uuid', 'Bearer k')).status, 400);
	assert.equal(ran, 0);
	const ok = await request(s.port, ACCT, 'Bearer k');
	assert.equal(ok.status, 200);
	assert.equal(ok.body, '{"service":"nn-boss","rows":3}\n');
	s.server.close();
});

// Needs a Postgres (PN_BOSS_TEST_DATABASE_URL); skipped without one.
test('erase against postgres', { skip: !process.env.PN_BOSS_TEST_DATABASE_URL }, async () => {
	const pool = new Pool({ connectionString: process.env.PN_BOSS_TEST_DATABASE_URL });
	for (const m of migrations) {
		await pool.query(m.sql);
	}
	const pids = [1900000001, 1900000002];
	const clean = async (): Promise<void> => {
		for (const t of ['boss_cec_data', 'boss_cec_slots', 'boss_tasks', 'boss_files_wup', 'boss_files_ctr']) {
			await pool.query(`DELETE FROM ${t} WHERE creator_pid = ANY($1::bigint[]) OR creator_pid = 0`, [pids]);
		}
	};
	await clean();
	for (const pid of pids) {
		await pool.query('INSERT INTO boss_cec_data (creator_pid, game_id, file_key, data_hash, size, created) VALUES ($1, 1, $2, $3, 1, 1)', [pid, `${pid}-x`, 'x']);
		await pool.query('INSERT INTO boss_cec_slots (creator_pid, game_id, latest_data_id) VALUES ($1, 1, \'a\')', [pid]);
		await pool.query('INSERT INTO boss_tasks (creator_pid, status, id, boss_app_id) VALUES ($1, \'open\', $2, \'a\')', [pid, `t${pid}`]);
	}
	const deleted: string[] = [];
	const del = async (keys: string[]): Promise<void> => {
		deleted.push(...keys);
	};
	const count = async (sql: string, ...params: unknown[]): Promise<number> => Number((await pool.query(sql, params)).rows[0].count);
	assert.equal(await eraseByPids([1900000001], pool, del), 3);
	assert.equal(await eraseByPids([1900000001], pool, del), 0);
	assert.deepEqual(deleted, ['1900000001-x']);
	assert.equal(await count('SELECT count(*) FROM boss_cec_data WHERE creator_pid = $1', 1900000002), 1);
	assert.equal(await count('SELECT count(*) FROM boss_cec_slots WHERE creator_pid = $1', 1900000002), 1);
	assert.equal(await count('SELECT count(*) FROM boss_tasks WHERE creator_pid = $1', 1900000002), 1);
	assert.equal(await count('SELECT count(*) FROM boss_tasks WHERE creator_pid = 0 AND id = \'t1900000001\''), 1);
	await clean();
	await pool.end();
});
