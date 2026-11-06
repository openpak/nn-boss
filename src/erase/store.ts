// The Postgres side of account erasure. The query runner and the CDN delete are passed in.
import type { Queryable } from '@/postgres';

const BATCH = 1000;

// StreetPass mailbox (boss_cec_data, boss_cec_slots) is the console user's own data: deleted, with
// its stored payloads. Tasks and files are operator-published SpotPass content that other players
// download: kept, creator_pid set to 0 ("deleted user").
export async function eraseByPids(
	pids: number[],
	q: Queryable,
	deleteSprFiles: (keys: string[]) => Promise<void>
): Promise<number> {
	let rows = 0;

	const data = await q.query<{ file_key: string | null }>('SELECT file_key FROM boss_cec_data WHERE creator_pid = ANY($1::bigint[])', [pids]);
	const keys = data.rows.map(d => d.file_key).filter((k): k is string => !!k);
	// Payloads first: if this throws, the rows stay and the erasure is retried.
	for (let i = 0; i < keys.length; i += BATCH) {
		await deleteSprFiles(keys.slice(i, i + BATCH));
	}

	rows += (await q.query('DELETE FROM boss_cec_data WHERE creator_pid = ANY($1::bigint[])', [pids])).rowCount ?? 0;
	rows += (await q.query('DELETE FROM boss_cec_slots WHERE creator_pid = ANY($1::bigint[])', [pids])).rowCount ?? 0;

	for (const table of ['boss_files_wup', 'boss_files_ctr', 'boss_tasks']) {
		rows += (await q.query(`UPDATE ${table} SET creator_pid = 0 WHERE creator_pid = ANY($1::bigint[])`, [pids])).rowCount ?? 0;
	}
	return rows;
}
