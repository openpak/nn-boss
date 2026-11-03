import express from 'express';
import xmlbuilder from 'xmlbuilder';
import { config } from '@/config-manager';
import { restrictHostnames } from '@/middleware/host-limit';
import { getTask, getWUPTaskFile, getWUPTaskFiles } from '@/database';
import type { HydratedFileWUPDocument } from '@/types/mongoose/file-wup';
import type { HydratedTaskDocument } from '@/types/mongoose/task';

const npts = express.Router();

const xmlHeadSettings = { encoding: 'UTF-8', version: '1.0' };

// Base of the data URLs a tasksheet hands out. Wii U system traffic that reaches us by IP literal
// (Inkay-openpak's IOSU patches, Traefik entrypoint wiiu-system) carries X-OpenPak-Npdi-Base, set
// by Traefik, so the console fetches the data by IP too and needs no DNS record. Everyone else
// gets the configured npdi domain (the first one; the setting is a comma-separated list).
const npdiBasePattern = /^https:\/\/[0-9.]+(:[0-9]{1,5})?$/;

function npdiBase(request: express.Request<any, any, any, any>): string {
	const header = request.get('X-OpenPak-Npdi-Base');
	if (header && npdiBasePattern.test(header)) {
		return header;
	}

	return `https://${config.domains.npdi[0]}`;
}

function buildFile(task: HydratedTaskDocument, file: HydratedFileWUPDocument, attributesMode: boolean, base: string): any {
	if (attributesMode) {
		return {
			Filename: file.name,
			Type: file.type,
			Size: file.size,
			Attributes: {
				Attribute1: file.attributes.attribute1,
				Attribute2: file.attributes.attribute2,
				Attribute3: file.attributes.attribute3,
				Description: file.attributes.description
			}
		};
	} else {
		return {
			Filename: file.name,
			DataId: file.data_id,
			Type: file.type,
			Url: `${base}/p01/data/1/${task.boss_app_id}/${file.data_id}/${file.hash}`,
			Size: file.size,
			Notify: {
				New: file.notify_on_new.join(','),
				LED: file.notify_led
			}
		};
	}
}

npts.get('/p01/tasksheet/:id/:bossAppId/:taskId', async (request: express.Request<{
	id: string;
	bossAppId: string;
	taskId: string;
}, any, any, {
	c?: string;
	l?: string;
	mode?: string;
}>, response) => {
	const { bossAppId, taskId } = request.params;
	const country = request.query.c;
	const language = request.query.l;
	const mode = request.query.mode;

	const task = await getTask(bossAppId, taskId);
	if (!task) {
		return response.sendStatus(404);
	}

	const files = await getWUPTaskFiles(false, bossAppId, taskId, country, language);

	const xmlContent = {
		TaskSheet: {
			TitleId: task.title_id,
			TaskId: task.id,
			ServiceStatus: task.status,
			Files: {
				File: files.map(f => buildFile(task, f, mode === 'attr', npdiBase(request)))
			}
		}
	};

	response.set('Content-Type', 'application/xml; charset=utf-8');
	response.send(xmlbuilder.create(xmlContent, xmlHeadSettings).end({ pretty: true }));
});

npts.get('/p01/tasksheet/:id/:bossAppId/:taskId/:fileName', async (request: express.Request<{
	id: string;
	bossAppId: string;
	taskId: string;
	fileName: string;
}, any, any, {
	c?: string;
	l?: string;
	mode?: string;
}>, response) => {
	const { bossAppId, taskId, fileName } = request.params;
	const country = request.query.c;
	const language = request.query.l;
	const mode = request.query.mode;

	const task = await getTask(bossAppId, taskId);
	if (!task) {
		return response.sendStatus(404);
	}

	const file = await getWUPTaskFile(bossAppId, taskId, fileName, country, language);
	if (!file) {
		return response.sendStatus(404);
	}

	const xmlContent = {
		TaskSheet: {
			TitleId: task.title_id,
			TaskId: task.id,
			ServiceStatus: task.status,
			Files: {
				File: buildFile(task, file, mode === 'attr', npdiBase(request))
			}
		}
	};

	response.set('Content-Type', 'application/xml; charset=utf-8');
	response.send(xmlbuilder.create(xmlContent, xmlHeadSettings).end({ pretty: true }));
});

const router = express.Router();

router.use(restrictHostnames(config.domains.npts, npts));

export default router;
