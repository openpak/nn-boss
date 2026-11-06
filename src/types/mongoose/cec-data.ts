import type { Doc } from '@/models/table';

export interface ICECData {
	creator_pid: number;
	game_id: number;
	data: string;
	data_hash: string;
	size: number;
	file_key: string;
	created: bigint;
}

export type HydratedCECDataDocument = Doc<ICECData & { id: string }>;
