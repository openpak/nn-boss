import { Table } from '@/models/table';
import type { ITask } from '@/types/mongoose/task';

export const Task = new Table<ITask>('boss_tasks', 'row_id', [
	{ field: 'deleted', kind: 'bool' },
	{ field: 'id', kind: 'text' },
	{ field: 'in_game_id', kind: 'text' },
	{ field: 'boss_app_id', kind: 'text' },
	{ field: 'creator_pid', kind: 'num' },
	{ field: 'status', kind: 'text' },
	{ field: 'interval', kind: 'int' },
	{ field: 'title_id', kind: 'text' },
	{ field: 'description', kind: 'text' },
	{ field: 'created', kind: 'bigint' },
	{ field: 'updated', kind: 'bigint' }
]);
