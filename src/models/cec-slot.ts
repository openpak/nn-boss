import { Table } from '@/models/table';
import type { ICECSlot } from '@/types/mongoose/cec-slot';

export const CECSlot = new Table<ICECSlot & { id: string }>('boss_cec_slots', 'id', [
	{ field: 'creator_pid', kind: 'num' },
	{ field: 'game_id', kind: 'num' },
	{ field: 'latest_data_id', kind: 'text' }
], true);
