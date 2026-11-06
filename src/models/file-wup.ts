import { Table } from '@/models/table';
import type { IFileWUP } from '@/types/mongoose/file-wup';

export const FileWUP = new Table<IFileWUP>('boss_files_wup', 'row_id', [
	{ field: 'deleted', kind: 'bool' },
	{ field: 'file_key', kind: 'text' },
	{ field: 'data_id', kind: 'bigint' }, // * from boss_wup_data_id_seq
	{ field: 'task_id', kind: 'text' },
	{ field: 'boss_app_id', kind: 'text' },
	{ field: 'supported_countries', kind: 'textarr' },
	{ field: 'supported_languages', kind: 'textarr' },
	{ field: 'attributes', kind: 'json' },
	{ field: 'creator_pid', kind: 'num' },
	{ field: 'name', kind: 'text' },
	{ field: 'type', kind: 'text' },
	{ field: 'hash', kind: 'text' },
	{ field: 'size', kind: 'bigint' },
	{ field: 'notify_on_new', kind: 'textarr' },
	{ field: 'notify_led', kind: 'bool' },
	{ field: 'condition_played', kind: 'bigint' },
	{ field: 'auto_delete', kind: 'bool' },
	{ field: 'created', kind: 'bigint' },
	{ field: 'updated', kind: 'bigint' }
]);
