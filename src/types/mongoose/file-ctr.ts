import type { Doc } from '@/models/table';

export interface IFileCTR {
	deleted: boolean;
	creator_pid: number;
	hash: string;
	file_key: string;
	size: bigint;
	task_id: string;
	boss_app_id: string;
	supported_countries: string[];
	supported_languages: string[];
	attributes: {
		attribute1: string;
		attribute2: string;
		attribute3: string;
		description: string;
	};
	name: string;
	serial_number: bigint; // * This is effectively the predecessor of the Wii U DataID
	payload_contents: {
		title_id: bigint;
		content_datatype: number;
		ns_data_id: number;
		version: number;
		size: number;
	}[];
	flags: {
		mark_arrived_privileged: boolean;
	};
	created: bigint;
	updated: bigint;
}

export type HydratedFileCTRDocument = Doc<IFileCTR>;
