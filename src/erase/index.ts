import http from 'node:http';
import { logger } from '@/logger';
import { config } from '@/config-manager';
import { bulkDeleteCdnFiles } from '@/cdn';
import { CECData } from '@/models/cec-data';
import { CECSlot } from '@/models/cec-slot';
import { FileWUP } from '@/models/file-wup';
import { FileCTR } from '@/models/file-ctr';
import { Task } from '@/models/task';
import { eraseAccount, eraseHandler, SERVICE } from '@/erase/core';
import { eraseByPids } from '@/erase/store';
import { makePidResolver } from '@/erase/pids';

// Serves the erase endpoint on ERASE_ADDR (default :9099, container network only). Without
// ACCOUNT_ERASE_KEY or the core settings nothing is served.
export function startEraseServer(): void {
	const key = process.env.ACCOUNT_ERASE_KEY?.trim() || '';
	const coreHost = process.env.PN_BOSS_CONFIG_OPEN_PAK_CORE_HOST?.trim() || '';
	const corePort = process.env.PN_BOSS_CONFIG_OPEN_PAK_CORE_PORT?.trim() || '';
	const coreKey = process.env.PN_BOSS_CONFIG_OPEN_PAK_CORE_KEY?.trim() || '';
	if (!key) {
		logger.warn('ACCOUNT_ERASE_KEY not set: the erase endpoint is not served');
		return;
	}
	if (!coreHost || !corePort || !coreKey) {
		logger.warn('PN_BOSS_CONFIG_OPEN_PAK_CORE_HOST/PORT/KEY not set: the erase endpoint is not served');
		return;
	}

	const resolvePids = makePidResolver({
		core: { address: `${coreHost}:${corePort}`, key: coreKey },
		account: { address: `${config.grpc.account.address}:${config.grpc.account.port}`, key: config.grpc.account.api_key }
	});
	const models = { CECData, CECSlot, FileWUP, FileCTR, Task };

	const handler = eraseHandler(key, async (accountId) => {
		try {
			return await eraseAccount(accountId, {
				resolvePids,
				eraseByPids: pids => eraseByPids(pids, models, keys => bulkDeleteCdnFiles('spr', keys)),
				log: (account, rows) => logger.info(`account erased account=${account} rows=${rows} service=${SERVICE}`)
			});
		} catch (error) {
			logger.error(`erase: account=${accountId}: ${(error as Error).message}`);
			throw error;
		}
	});

	const addr = process.env.ERASE_ADDR?.trim() || ':9099';
	const idx = addr.lastIndexOf(':');
	const host = addr.slice(0, idx) || undefined;
	const port = Number(addr.slice(idx + 1));
	http.createServer(handler).listen(port, host, () => logger.info(`Erase endpoint on ${addr}`));
}
