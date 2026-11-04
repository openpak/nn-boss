// PID lookup for erasure, the way nn-friends does it: every wiiu/3ds link the core holds for the
// account, plus the PID nn-account resolves (a shadow PNID has no core link).
import * as grpc from '@grpc/grpc-js';
import * as protoLoader from '@grpc/proto-loader';

const method = (requestType: string, responseType: string): { requestType: string; responseType: string; comment: string } => ({ requestType, responseType, comment: '' });

const def = protoLoader.fromJSON({
	nested: {
		openpak: {
			nested: {
				account: {
					nested: {
						v1: {
							nested: {
								ListAccountLinksRequest: { fields: { account_id: { type: 'string', id: 1 }, namespace: { type: 'string', id: 2 } } },
								AccountLink: { fields: { link_id: { type: 'string', id: 1 }, namespace: { type: 'string', id: 2 }, subject_id: { type: 'string', id: 3 }, public_code: { type: 'string', id: 4 } } },
								ListAccountLinksResponse: { fields: { links: { rule: 'repeated', type: 'AccountLink', id: 1 } } },
								Links: { methods: { ListAccountLinks: method('ListAccountLinksRequest', 'ListAccountLinksResponse') } }
							}
						}
					}
				}
			}
		},
		nn_account: {
			nested: {
				resolution: {
					nested: {
						v1: {
							nested: {
								ResolveAccountRequest: { fields: { namespace: { type: 'string', id: 1 }, account_id: { type: 'string', id: 2 } } },
								ResolveAccountResponse: { fields: { found: { type: 'bool', id: 1 }, pid: { type: 'uint32', id: 2 } } },
								Resolution: { methods: { ResolveAccount: method('ResolveAccountRequest', 'ResolveAccountResponse') } }
							}
						}
					}
				}
			}
		}
	}
}, { keepCase: true });
const pkg = grpc.loadPackageDefinition(def) as any;

function call<T>(client: any, method: string, request: object, metadata: grpc.Metadata): Promise<T> {
	return new Promise((resolve, reject) => {
		client[method](request, metadata, { deadline: Date.now() + 5000 }, (error: Error | null, response: T) => {
			if (error) {
				reject(error);
			} else {
				resolve(response);
			}
		});
	});
}

export interface PidSources {
	core: { address: string; key: string };
	account: { address: string; key: string };
}

export function makePidResolver(sources: PidSources): (accountId: string) => Promise<number[]> {
	const links = new pkg.openpak.account.v1.Links(sources.core.address, grpc.credentials.createInsecure());
	const resolution = new pkg.nn_account.resolution.v1.Resolution(sources.account.address, grpc.credentials.createInsecure());

	return async (accountId) => {
		const pids = new Set<number>();
		const coreMeta = new grpc.Metadata();
		coreMeta.set('x-internal-key', sources.core.key);
		const response = await call<{ links: { namespace: string; subject_id: string }[] }>(
			links, 'ListAccountLinks', { account_id: accountId }, coreMeta);
		for (const link of response.links ?? []) {
			if (link.namespace === 'wiiu' || link.namespace === '3ds') {
				const pid = Number(link.subject_id);
				if (Number.isInteger(pid) && pid > 0) {
					pids.add(pid);
				}
			}
		}
		for (const namespace of ['wiiu', '3ds']) {
			const meta = new grpc.Metadata();
			meta.set('X-API-Key', sources.account.key);
			const found = await call<{ found: boolean; pid: number }>(
				resolution, 'ResolveAccount', { namespace, account_id: accountId }, meta);
			if (found.found && found.pid > 0) {
				pids.add(found.pid);
			}
		}
		return [...pids];
	};
}
