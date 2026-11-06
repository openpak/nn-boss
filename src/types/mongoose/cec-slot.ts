import type { Doc } from '@/models/table';

export interface ICECSlot {
	creator_pid: number;
	game_id: number;
	latest_data_id: string;
}

export type HydratedCECSlotDocument = Doc<ICECSlot & { id: string }>;
