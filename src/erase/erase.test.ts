import { test } from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import mongoose from 'mongoose';
import { CECData } from '@/models/cec-data';
import { CECSlot } from '@/models/cec-slot';
import { FileWUP } from '@/models/file-wup';
import { FileCTR } from '@/models/file-ctr';
import { Task } from '@/models/task';
import { eraseByPids } from '@/erase/store';
import { eraseAccount, eraseHandler } from '@/erase/core';
import type { AddressInfo } from 'node:net';
import type { EraseModels } from '@/erase/store';

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

// Needs a MongoDB (PN_BOSS_TEST_MONGO_URL); skipped without one.
test('erase against mongo', { skip: !process.env.PN_BOSS_TEST_MONGO_URL }, async () => {
	await mongoose.connect(process.env.PN_BOSS_TEST_MONGO_URL as string);
	const models = { CECData, CECSlot, FileWUP, FileCTR, Task } as unknown as EraseModels;
	const all = Object.values(models);
	for (const m of all) {
		await m.deleteMany({ creator_pid: { $in: [1900000001, 1900000002] } });
	}
	for (const pid of [1900000001, 1900000002]) {
		await CECData.create({ creator_pid: pid, game_id: 1, file_key: `${pid}-x`, data_hash: 'x', size: 1, created: 1n });
		await CECSlot.create({ creator_pid: pid, game_id: 1, latest_data_id: 'a' });
		await Task.create({ creator_pid: pid, status: 'open', id: `t${pid}`, boss_app_id: 'a' });
	}
	const deleted: string[] = [];
	const del = async (keys: string[]): Promise<void> => {
		deleted.push(...keys);
	};
	assert.equal(await eraseByPids([1900000001], models, del), 3);
	assert.equal(await eraseByPids([1900000001], models, del), 0);
	assert.deepEqual(deleted, ['1900000001-x']);
	assert.equal(await CECData.countDocuments({ creator_pid: 1900000002 }), 1);
	assert.equal(await CECSlot.countDocuments({ creator_pid: 1900000002 }), 1);
	assert.equal(await Task.countDocuments({ creator_pid: 1900000002 }), 1);
	assert.equal(await Task.countDocuments({ creator_pid: 0, id: 't1900000001' }), 1);
	for (const m of all) {
		await m.deleteMany({ creator_pid: { $in: [0, 1900000002] }, boss_app_id: { $in: ['a', undefined] } });
	}
	await mongoose.disconnect();
});
