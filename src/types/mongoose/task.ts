import type { Doc } from '@/models/table';

export interface ITask {
	deleted: boolean;
	id: string;
	in_game_id: string;
	boss_app_id: string;
	creator_pid: number;
	status: 'open' | 'close';
	interval: number;
	title_id: string;
	description: string;
	created: bigint;
	updated: bigint;
}

export type HydratedTaskDocument = Doc<ITask>;
