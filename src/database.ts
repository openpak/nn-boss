import { db, connectPostgres } from '@/postgres';
import { Task } from '@/models/task';
import { CECData } from '@/models/cec-data';
import { FileCTR } from '@/models/file-ctr';
import { FileWUP } from '@/models/file-wup';
import type { HydratedCECDataDocument } from '@/types/mongoose/cec-data';
import type { HydratedTaskDocument } from '@/types/mongoose/task';
import type { HydratedFileCTRDocument } from '@/types/mongoose/file-ctr';
import type { HydratedFileWUPDocument } from '@/types/mongoose/file-wup';

export async function connect(): Promise<void> {
	await connectPostgres();
}

// * Country/language filter shared by the file queries. A file with an empty list is available
// * everywhere; otherwise it must list the requested value. Without a requested value only the
// * unrestricted files match, unless `any` is set.
function localeFilter(params: unknown[], column: string, value: string | undefined, any: boolean): string | null {
	if (value) {
		params.push(value);
		return `(${column} = '{}' OR $${params.length} = ANY(${column}))`;
	}
	return any ? null : `${column} = '{}'`;
}

function fileFilter(table: 'boss_files_ctr' | 'boss_files_wup', allowDeleted: boolean, bossAppID: string, taskID: string, country?: string, language?: string, any: boolean = false): { where: string; params: unknown[] } {
	void table;
	const params: unknown[] = [taskID.slice(0, 7), bossAppID];
	const parts = ['task_id = $1', 'boss_app_id = $2'];
	if (!allowDeleted) {
		parts.push('deleted = false');
	}
	for (const part of [localeFilter(params, 'supported_countries', country, any), localeFilter(params, 'supported_languages', language, any)]) {
		if (part) {
			parts.push(part);
		}
	}
	return { where: parts.join(' AND '), params };
}

export async function getAllTasks(allowDeleted: boolean): Promise<HydratedTaskDocument[]> {
	const result = await db().query(`SELECT * FROM boss_tasks ${allowDeleted ? '' : 'WHERE deleted = false'} ORDER BY row_id`);
	return Task.hydrateAll(result.rows);
}

export async function getTask(bossAppID: string, taskID: string): Promise<HydratedTaskDocument | null> {
	const result = await db().query('SELECT * FROM boss_tasks WHERE deleted = false AND id = $1 AND boss_app_id = $2 ORDER BY row_id LIMIT 1', [taskID.slice(0, 7), bossAppID]);
	return Task.hydrate(result.rows[0]);
}

export async function getCTRTaskFiles(allowDeleted: boolean, bossAppID: string, taskID: string, country?: string, language?: string, any: boolean = false): Promise<HydratedFileCTRDocument[]> {
	const { where, params } = fileFilter('boss_files_ctr', allowDeleted, bossAppID, taskID, country, language, any);
	const result = await db().query(`SELECT * FROM boss_files_ctr WHERE ${where} ORDER BY row_id`, params);
	return FileCTR.hydrateAll(result.rows);
}

export async function getWUPTaskFiles(allowDeleted: boolean, bossAppID: string, taskID: string, country?: string, language?: string, any: boolean = false): Promise<HydratedFileWUPDocument[]> {
	const { where, params } = fileFilter('boss_files_wup', allowDeleted, bossAppID, taskID, country, language, any);
	const result = await db().query(`SELECT * FROM boss_files_wup WHERE ${where} ORDER BY row_id`, params);
	return FileWUP.hydrateAll(result.rows);
}

export async function getCTRTaskFilesWithAttributes(allowDeleted: boolean, bossAppID: string, taskID: string, country?: string, language?: string, attribute1?: string, attribute2?: string, attribute3?: string): Promise<HydratedFileCTRDocument[]> {
	// * Unlike getCTRTaskFiles, an absent country or language means "unrestricted files only" here
	const { where, params } = fileFilter('boss_files_ctr', allowDeleted, bossAppID, taskID, country, language, false);
	const parts = [where];
	for (const [key, value] of [['attribute1', attribute1], ['attribute2', attribute2], ['attribute3', attribute3]]) {
		if (value) {
			params.push(key, value);
			parts.push(`attributes ->> $${params.length - 1} = $${params.length}`);
		}
	}
	const result = await db().query(`SELECT * FROM boss_files_ctr WHERE ${parts.join(' AND ')} ORDER BY row_id`, params);
	return FileCTR.hydrateAll(result.rows);
}

export async function getCTRTaskFile(bossAppID: string, taskID: string, name: string, country?: string, language?: string): Promise<HydratedFileCTRDocument | null> {
	const { where, params } = fileFilter('boss_files_ctr', false, bossAppID, taskID, country, language, false);
	params.push(name);
	const result = await db().query(`SELECT * FROM boss_files_ctr WHERE ${where} AND name = $${params.length} ORDER BY row_id LIMIT 1`, params);
	return FileCTR.hydrate(result.rows[0]);
}

export async function getWUPTaskFile(bossAppID: string, taskID: string, name: string, country?: string, language?: string): Promise<HydratedFileWUPDocument | null> {
	const { where, params } = fileFilter('boss_files_wup', false, bossAppID, taskID, country, language, false);
	params.push(name);
	const result = await db().query(`SELECT * FROM boss_files_wup WHERE ${where} AND name = $${params.length} ORDER BY row_id LIMIT 1`, params);
	return FileWUP.hydrate(result.rows[0]);
}

export async function getCTRTaskFileBySerialNumber(serialNumber: bigint): Promise<HydratedFileCTRDocument | null> {
	const result = await db().query('SELECT * FROM boss_files_ctr WHERE deleted = false AND serial_number = $1', [String(serialNumber)]);
	return FileCTR.hydrate(result.rows[0]);
}

export async function getWUPTaskFileByDataID(dataID: bigint): Promise<HydratedFileWUPDocument | null> {
	const result = await db().query('SELECT * FROM boss_files_wup WHERE deleted = false AND data_id = $1', [String(dataID)]);
	return FileWUP.hydrate(result.rows[0]);
}

export async function getDuplicateCECData(pid: number, gameID: number): Promise<HydratedCECDataDocument | null> {
	const result = await db().query('SELECT * FROM boss_cec_data WHERE creator_pid = $1 AND game_id = $2 LIMIT 1', [pid, gameID]);
	return CECData.hydrate(result.rows[0]);
}

export async function getRandomCECData(pids: number[], gameID: number): Promise<HydratedCECDataDocument | null> {
	// * We search through the CECSlot so that everyone has the same chance of getting their data picked up
	const result = await db().query(
		`SELECT d.* FROM boss_cec_slots s JOIN boss_cec_data d ON d.id = s.latest_data_id
		  WHERE s.creator_pid = ANY($1::bigint[]) AND s.game_id = $2
		  ORDER BY random() LIMIT 1`,
		[pids, gameID]
	);
	return CECData.hydrate(result.rows[0]);
}

// Upsert a user's slot to point at their newest StreetPass data.
export async function setCECSlot(pid: number, gameID: number, latestDataID: string): Promise<void> {
	await db().query(
		`INSERT INTO boss_cec_slots (creator_pid, game_id, latest_data_id) VALUES ($1, $2, $3)
		 ON CONFLICT (creator_pid, game_id) DO UPDATE SET latest_data_id = EXCLUDED.latest_data_id`,
		[pid, gameID, latestDataID]
	);
}

export async function deleteOldCECData(olderThan: Date, limit: number): Promise<{ id: string; file_key: string }[]> {
	const result = await db().query(
		`WITH old AS (SELECT id, file_key FROM boss_cec_data WHERE created < $1 ORDER BY created LIMIT $2),
		      gone AS (DELETE FROM boss_cec_data d USING old WHERE d.id = old.id RETURNING d.id),
		      slots AS (DELETE FROM boss_cec_slots s USING old WHERE s.latest_data_id = old.id RETURNING s.id)
		 SELECT id, file_key FROM old`,
		[String(olderThan.getTime()), limit]
	);
	return result.rows;
}
