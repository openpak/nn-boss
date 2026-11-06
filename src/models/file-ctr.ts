import { Table } from '@/models/table';
import type { IFileCTR } from '@/types/mongoose/file-ctr';

export const FileCTR = new Table<IFileCTR>('boss_files_ctr', 'row_id', [
	{ field: 'deleted', kind: 'bool' },
	{ field: 'creator_pid', kind: 'num' },
	{ field: 'hash', kind: 'text' },
	{ field: 'file_key', kind: 'text' },
	{ field: 'size', kind: 'bigint' },
	{ field: 'task_id', kind: 'text' },
	{ field: 'boss_app_id', kind: 'text' },
	{ field: 'supported_countries', kind: 'textarr' },
	{ field: 'supported_languages', kind: 'textarr' },
	{ field: 'attributes', kind: 'json' },
	{ field: 'name', kind: 'text' },
	{ field: 'serial_number', kind: 'bigint' }, // * from boss_ctr_serial_seq; effectively the predecessor of the Wii U DataID
	{ field: 'payload_contents', kind: 'payloads' },
	{ field: 'flags', kind: 'json' },
	{ field: 'created', kind: 'bigint' },
	{ field: 'updated', kind: 'bigint' }
]);
