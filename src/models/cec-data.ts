import { Table } from '@/models/table';
import type { ICECData } from '@/types/mongoose/cec-data';

export const CECData = new Table<ICECData & { id: string }>('boss_cec_data', 'id', [
	{ field: 'creator_pid', kind: 'num' },
	{ field: 'game_id', kind: 'num' },
	{ field: 'data', kind: 'text' },
	{ field: 'file_key', kind: 'text' },
	{ field: 'data_hash', kind: 'text' },
	{ field: 'size', kind: 'int' },
	{ field: 'created', kind: 'bigint' }
], true);
