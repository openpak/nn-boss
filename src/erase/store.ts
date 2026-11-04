// The Mongo side of account erasure. Models and the CDN delete are passed in.
import type { Model } from 'mongoose';

export interface EraseModels {
	CECData: Model<any>;
	CECSlot: Model<any>;
	FileWUP: Model<any>;
	FileCTR: Model<any>;
	Task: Model<any>;
}

const BATCH = 1000;

// StreetPass mailbox (CECData, CECSlot) is the console user's own data: deleted, with its
// stored payloads. Tasks and files are operator-published SpotPass content that other players
// download: kept, creator_pid set to 0 ("deleted user").
export async function eraseByPids(
	pids: number[],
	models: EraseModels,
	deleteSprFiles: (keys: string[]) => Promise<void>
): Promise<number> {
	let rows = 0;

	const data = await models.CECData.find({ creator_pid: { $in: pids } }, { file_key: 1 }).lean();
	const keys = (data as { file_key?: string }[]).map(d => d.file_key).filter((k): k is string => !!k);
	// Payloads first: if this throws, the rows stay and the erasure is retried.
	for (let i = 0; i < keys.length; i += BATCH) {
		await deleteSprFiles(keys.slice(i, i + BATCH));
	}

	rows += (await models.CECData.deleteMany({ creator_pid: { $in: pids } })).deletedCount;
	rows += (await models.CECSlot.deleteMany({ creator_pid: { $in: pids } })).deletedCount;

	for (const model of [models.FileWUP, models.FileCTR, models.Task]) {
		rows += (await model.updateMany({ creator_pid: { $in: pids } }, { $set: { creator_pid: 0 } })).modifiedCount;
	}
	return rows;
}
