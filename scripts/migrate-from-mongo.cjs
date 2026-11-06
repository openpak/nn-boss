// One-shot import of the old Mongo data into Postgres. Idempotent (legacy_mongo_id is unique).
//
//   1. On the box, export each collection as extended-JSON lines with mongosh (see docs/deploy.md):
//        mongosh boss --quiet --eval 'db.tasks.find().sort({_id:1}).forEach(d => print(EJSON.stringify(d)))' > tasks.ndjson
//      likewise files-wup, files-ctr, cecdatas, cecslots; and the counter:
//        mongosh boss --quiet --eval 'db.identitycounters.find().forEach(d => print(EJSON.stringify(d)))' > counters.ndjson
//   2. node scripts/migrate-from-mongo.cjs <dir>      (PN_BOSS_CONFIG_DATABASE_URL set)
//
// Prints the line count (Mongo) and the row count (Postgres) per table before and after, and exits 1
// when they differ.
const fs = require('node:fs');
const path = require('node:path');
const { Pool } = require('pg');

const dir = process.argv[2];
if (!dir) {
	console.error('usage: migrate-from-mongo.cjs <dir with *.ndjson>');
	process.exit(2);
}

const unwrap = (v) => {
	if (v && typeof v === 'object' && !Array.isArray(v)) {
		if ('$numberLong' in v) return v.$numberLong;
		if ('$numberInt' in v) return Number(v.$numberInt);
		if ('$numberDouble' in v) return Number(v.$numberDouble);
		if ('$oid' in v) return v.$oid;
		return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, unwrap(x)]));
	}
	return Array.isArray(v) ? v.map(unwrap) : v;
};

function read(name) {
	const file = path.join(dir, name + '.ndjson');
	if (!fs.existsSync(file)) return [];
	return fs.readFileSync(file, 'utf8').split('\n').filter(Boolean).map((l) => unwrap(JSON.parse(l)));
}

const arr = (v) => (Array.isArray(v) ? v : []);
const json = (v) => JSON.stringify(v ?? {});

const tables = [
	{
		file: 'tasks', table: 'boss_tasks',
		cols: ['deleted', 'id', 'in_game_id', 'boss_app_id', 'creator_pid', 'status', 'interval', 'title_id', 'description', 'created', 'updated', 'legacy_mongo_id'],
		row: (d) => [d.deleted ?? false, d.id, d.in_game_id, d.boss_app_id, d.creator_pid, d.status, d.interval, d.title_id, d.description, d.created, d.updated, d._id]
	},
	{
		file: 'files-wup', table: 'boss_files_wup',
		cols: ['deleted', 'file_key', 'data_id', 'task_id', 'boss_app_id', 'supported_countries', 'supported_languages', 'attributes', 'creator_pid', 'name', 'type', 'hash', 'size', 'notify_on_new', 'notify_led', 'condition_played', 'auto_delete', 'created', 'updated', 'legacy_mongo_id'],
		row: (d) => [d.deleted ?? false, d.file_key, d.data_id, d.task_id, d.boss_app_id, arr(d.supported_countries), arr(d.supported_languages), json(d.attributes), d.creator_pid, d.name, d.type, d.hash, d.size, arr(d.notify_on_new), d.notify_led, d.condition_played, d.auto_delete, d.created, d.updated, d._id]
	},
	{
		file: 'files-ctr', table: 'boss_files_ctr',
		cols: ['deleted', 'creator_pid', 'hash', 'file_key', 'size', 'task_id', 'boss_app_id', 'supported_countries', 'supported_languages', 'attributes', 'name', 'serial_number', 'payload_contents', 'flags', 'created', 'updated', 'legacy_mongo_id'],
		row: (d) => [d.deleted ?? false, d.creator_pid, d.hash, d.file_key, d.size, d.task_id, d.boss_app_id, arr(d.supported_countries), arr(d.supported_languages), json(d.attributes), d.name, d.serial_number, JSON.stringify(arr(d.payload_contents)), json(d.flags), d.created, d.updated, d._id]
	},
	{
		file: 'cecdatas', table: 'boss_cec_data',
		cols: ['id', 'creator_pid', 'game_id', 'data', 'file_key', 'data_hash', 'size', 'created', 'legacy_mongo_id'],
		row: (d) => [d._id, d.creator_pid, d.game_id, d.data, d.file_key, d.data_hash, d.size, d.created, d._id]
	},
	{
		file: 'cecslots', table: 'boss_cec_slots',
		cols: ['id', 'creator_pid', 'game_id', 'latest_data_id', 'legacy_mongo_id'],
		row: (d) => [d._id, d.creator_pid, d.game_id, d.latest_data_id, d._id]
	}
];

(async () => {
	const pool = new Pool({ connectionString: process.env.PN_BOSS_CONFIG_DATABASE_URL });
	const count = async (t) => Number((await pool.query(`SELECT count(*) FROM ${t}`)).rows[0].count);
	const report = async (label) => {
		for (const t of tables) console.log(label, t.table, 'mongo', read(t.file).length, 'postgres', await count(t.table));
	};
	await report('before');
	for (const t of tables) {
		for (const d of read(t.file)) {
			const ph = t.cols.map((_, i) => `$${i + 1}`).join(', ');
			await pool.query(`INSERT INTO ${t.table} (${t.cols.join(', ')}) VALUES (${ph}) ON CONFLICT (legacy_mongo_id) DO NOTHING`, t.row(d));
		}
	}
	// Sequences continue after the highest id ever handed out (the old identity counter, or the highest row).
	const counters = read('counters');
	const wupCounter = Math.max(0, ...counters.filter((c) => c.field === 'data_id').map((c) => Number(c.count)));
	const wupMax = Number((await pool.query('SELECT coalesce(max(data_id), 0) AS m FROM boss_files_wup')).rows[0].m);
	const wup = Math.max(wupCounter, wupMax, 49999);
	await pool.query('SELECT setval(\'boss_wup_data_id_seq\', $1, true)', [wup]);
	const ctrMax = Number((await pool.query('SELECT coalesce(max(serial_number), 0) AS m FROM boss_files_ctr')).rows[0].m);
	await pool.query('SELECT setval(\'boss_ctr_serial_seq\', $1, true)', [Math.max(ctrMax, 49999)]);
	console.log('sequences: wup data_id continues after', wup, '; ctr serial after', Math.max(ctrMax, 49999));
	await report('after');
	let bad = 0;
	for (const t of tables) if (read(t.file).length !== (await pool.query(`SELECT count(*) FROM ${t.table} WHERE legacy_mongo_id IS NOT NULL`)).rows[0].count * 1) bad++;
	await pool.end();
	process.exit(bad ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(2); });
