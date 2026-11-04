// Account erasure (card openpak/prds#120). The website's erasure finaliser calls
// DELETE /internal/accounts/{account_id}/data before the core deletes the account's
// console links. This file has no imports from the rest of the service so it can be
// tested on its own.
import crypto from 'node:crypto';
import type http from 'node:http';

export const SERVICE = 'nn-boss';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface EraseDeps {
	// Every Wii U / 3DS PID the account has. Must throw when it could not find out, so a
	// failed lookup is retried and not mistaken for "nothing to erase".
	resolvePids: (accountId: string) => Promise<number[]>;
	// Deletes or anonymises everything keyed by these PIDs and returns the row count.
	eraseByPids: (pids: number[]) => Promise<number>;
	log: (accountId: string, rows: number) => void;
}

export async function eraseAccount(accountId: string, deps: EraseDeps): Promise<number> {
	const pids = (await deps.resolvePids(accountId)).filter(p => Number.isInteger(p) && p > 0);
	const rows = pids.length === 0 ? 0 : await deps.eraseByPids([...new Set(pids)]);
	deps.log(accountId, rows);
	return rows;
}

function send(response: http.ServerResponse, status: number, body: unknown): void {
	response.writeHead(status, { 'Content-Type': 'application/json' });
	response.end(JSON.stringify(body) + '\n');
}

function keyMatches(header: string | undefined, key: string): boolean {
	if (!header?.startsWith('Bearer ')) {
		return false;
	}
	const got = crypto.createHash('sha256').update(header.slice(7)).digest();
	const want = crypto.createHash('sha256').update(key).digest();
	return crypto.timingSafeEqual(got, want);
}

// An empty key answers 503 to everything: never an open door.
export function eraseHandler(key: string, run: (accountId: string) => Promise<number>): http.RequestListener {
	return (request, response) => {
		const url = (request.url ?? '').split('?')[0];
		const match = /^\/internal\/accounts\/([^/]+)\/data$/.exec(url);
		if (!match || request.method !== 'DELETE') {
			send(response, 404, { error: 'not found' });
			return;
		}
		if (!key) {
			send(response, 503, { error: 'erasure not configured' });
			return;
		}
		if (!keyMatches(request.headers.authorization, key)) {
			send(response, 401, { error: 'unauthorized' });
			return;
		}
		if (!UUID_RE.test(match[1])) {
			send(response, 400, { error: 'account_id must be a UUID' });
			return;
		}
		run(match[1].toLowerCase()).then((rows) => {
			send(response, 200, { service: SERVICE, rows });
		}, () => {
			send(response, 500, { error: 'erase failed' });
		});
	};
}
