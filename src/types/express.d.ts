import type { GetNEXDataResponse } from '@pretendonetwork/grpc/account/v2/get_nex_data_rpc';

declare global {
	namespace Express {
		interface Request {
			files?: Record<string, any>;
			pid: number;
			nexAccount: GetNEXDataResponse | null;
		}
	}
}
