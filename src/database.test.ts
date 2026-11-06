// Query behaviour against a real Postgres (PN_BOSS_TEST_DATABASE_URL); skipped without one.
import { test } from 'node:test';
import assert from 'node:assert/strict';

const url = process.env.PN_BOSS_TEST_DATABASE_URL;

test('boss queries against postgres', { skip: !url }, async () => {
	Object.assign(process.env, {
		PN_BOSS_CONFIG_HTTP_PORT: '1', PN_BOSS_CONFIG_GRPC_BOSS_SERVER_ADDRESS: 'x', PN_BOSS_CONFIG_GRPC_BOSS_SERVER_PORT: '1',
		PN_BOSS_CONFIG_GRPC_BOSS_SERVER_API_KEY: 'x', PN_BOSS_CONFIG_GRPC_ACCOUNT_SERVER_ADDRESS: 'x', PN_BOSS_CONFIG_GRPC_ACCOUNT_SERVER_PORT: '1',
		PN_BOSS_CONFIG_GRPC_ACCOUNT_SERVER_API_KEY: 'x', PN_BOSS_CONFIG_GRPC_FRIENDS_SERVER_ADDRESS: 'x', PN_BOSS_CONFIG_GRPC_FRIENDS_SERVER_PORT: '1',
		PN_BOSS_CONFIG_GRPC_FRIENDS_SERVER_API_KEY: 'x', PN_BOSS_CONFIG_DATABASE_URL: url, PN_BOSS_CONFIG_CDN_DISK_PATH: 'scratch-cdn'
	});
	const d = await import('@/database');
	const { db, withTransaction } = await import('@/postgres');
	const { Task } = await import('@/models/task');
	const { FileWUP } = await import('@/models/file-wup');
	const { FileCTR } = await import('@/models/file-ctr');
	const { CECData } = await import('@/models/cec-data');
	await d.connect();
	const q = db();
	for (const t of ['boss_cec_data', 'boss_cec_slots', 'boss_tasks', 'boss_files_wup', 'boss_files_ctr']) {
		await q.query(`DELETE FROM ${t} WHERE boss_app_id = 'tapp' OR creator_pid = 77`.replace(/boss_app_id = 'tapp' OR /, t.startsWith('boss_cec') ? '' : 'boss_app_id = \'tapp\' OR '));
	}

	const task = await Task.create({ id: 'tsk1234', boss_app_id: 'tapp', status: 'open', creator_pid: 77, created: 5n });
	assert.equal(task.created, 5n);
	assert.equal(task.creator_pid, 77);
	assert.equal((await d.getTask('tapp', 'tsk1234xyz'))?.id, 'tsk1234');
	task.deleted = true;
	await task.save();
	assert.equal(await d.getTask('tapp', 'tsk1234'), null);
	assert.ok((await d.getAllTasks(true)).some(t => t.id === 'tsk1234'));
	assert.ok(!(await d.getAllTasks(false)).some(t => t.id === 'tsk1234'));

	const mk = (name: string, countries: string[], languages: string[]): ReturnType<typeof FileWUP.create> => FileWUP.create({
		task_id: 'tsk1234', boss_app_id: 'tapp', name, type: 'Message', size: 9n, creator_pid: 77,
		supported_countries: countries, supported_languages: languages,
		attributes: { attribute1: 'a', attribute2: '', attribute3: '', description: '' }, created: 1n, updated: 1n
	});
	const all = await mk('all', [], []);
	const us = await mk('us', ['US'], []);
	await mk('fr', ['FR'], ['fr']);
	assert.ok(all.data_id >= 50000n && us.data_id > all.data_id);
	const names = async (c?: string, l?: string, any = false): Promise<string[]> => (await d.getWUPTaskFiles(false, 'tapp', 'tsk1234', c, l, any)).map(f => f.name).sort();
	assert.deepEqual(await names(), ['all']);
	assert.deepEqual(await names('US'), ['all', 'us']); // unrestricted languages still match
	assert.deepEqual(await names('US', 'en'), ['all', 'us']);
	assert.deepEqual(await names('FR', 'fr'), ['all', 'fr']);
	assert.deepEqual(await names('FR'), ['all']); // fr is language-restricted
	assert.deepEqual(await names(undefined, undefined, true), ['all', 'fr', 'us']);
	assert.equal((await d.getWUPTaskFileByDataID(us.data_id))?.name, 'us');
	us.deleted = true;
	await us.save();
	assert.equal(await d.getWUPTaskFileByDataID(us.data_id), null);

	const ctr = await withTransaction(async tx => FileCTR.create({
		task_id: 'tsk1234', boss_app_id: 'tapp', name: 'c', creator_pid: 77, attributes: { attribute1: 'z', attribute2: '', attribute3: '', description: '' },
		payload_contents: [{ title_id: 0x0004000000123400n, content_datatype: 1, ns_data_id: 2, version: 3, size: 4 }],
		flags: { mark_arrived_privileged: true }, created: 1n, updated: 1n
	}, tx));
	const back = await d.getCTRTaskFileBySerialNumber(ctr.serial_number);
	assert.equal(back?.payload_contents[0].title_id, 0x0004000000123400n);
	assert.equal((await d.getCTRTaskFilesWithAttributes(false, 'tapp', 'tsk1234', undefined, undefined, 'z')).length, 1);
	assert.equal((await d.getCTRTaskFilesWithAttributes(false, 'tapp', 'tsk1234', undefined, undefined, 'nope')).length, 0);
	await assert.rejects(withTransaction(async (tx) => {
		await FileCTR.create({ task_id: 'tsk1234', boss_app_id: 'tapp', name: 'rolled', created: 1n }, tx);
		throw new Error('abort');
	}));
	assert.equal(await d.getCTRTaskFile('tapp', 'tsk1234', 'rolled'), null);

	const old = await CECData.create({ creator_pid: 77, game_id: 5, file_key: 'k1', data_hash: 'h', size: 3, created: 10n });
	await d.setCECSlot(77, 5, old.id);
	await d.setCECSlot(77, 5, old.id);
	assert.equal((await d.getRandomCECData([77], 5))?.file_key, 'k1');
	assert.equal((await d.getDuplicateCECData(77, 5))?.id, old.id);
	assert.equal(await d.getRandomCECData([78], 5), null);
	assert.deepEqual(await d.deleteOldCECData(new Date(11), 10), [{ id: old.id, file_key: 'k1' }]);
	assert.equal(await d.getRandomCECData([77], 5), null);

	for (const t of ['boss_cec_data', 'boss_cec_slots', 'boss_tasks', 'boss_files_wup', 'boss_files_ctr']) {
		await q.query(`DELETE FROM ${t} WHERE creator_pid = 77`);
	}
	await q.end();
});
