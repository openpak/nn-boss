import { db } from '@/postgres';
import type { Queryable } from '@/postgres';

// A tiny row mapper that keeps the document-style surface the services were written for:
// create(), find helpers returning objects with plain fields, and save() writing them back.
export type Kind = 'text' | 'int' | 'num' | 'bool' | 'bigint' | 'textarr' | 'json' | 'payloads';

export type Doc<T> = T & { save: (tx?: Queryable) => Promise<void> };

// Bigint fields also take plain numbers (Date.now()).
export type Input<T> = { [K in keyof T]?: T[K] extends bigint ? bigint | number : T[K] };

export interface Column {
	field: string;
	kind: Kind;
}

export class Table<T extends object> {
	// The primary key column and whether its value is exposed as a field of the document.
	constructor(
		readonly name: string,
		readonly pk: string,
		readonly columns: Column[],
		readonly exposePk: boolean = false
	) {}

	private dbValue(kind: Kind, value: unknown): unknown {
		if (value === undefined || value === null) {
			return null;
		}
		switch (kind) {
			case 'bigint':
				return String(value);
			case 'json':
				return JSON.stringify(value);
			case 'payloads':
				return JSON.stringify((value as Record<string, unknown>[]).map(p => ({ ...p, title_id: String(p.title_id) })));
			default:
				return value;
		}
	}

	private jsValue(kind: Kind, value: unknown): unknown {
		if (value === null || value === undefined) {
			return kind === 'textarr' ? [] : value;
		}
		switch (kind) {
			case 'bigint':
				return BigInt(value as string);
			case 'num':
				return Number(value);
			case 'payloads':
				return (value as Record<string, unknown>[]).map(p => ({ ...p, title_id: BigInt(p.title_id as string) }));
			default:
				return value;
		}
	}

	hydrate(row: Record<string, any> | undefined | null): Doc<T> | null {
		if (!row) {
			return null;
		}
		const doc: Record<string, unknown> = {};
		for (const c of this.columns) {
			doc[c.field] = this.jsValue(c.kind, row[c.field]);
		}
		const pkValue = row[this.pk];
		if (this.exposePk) {
			doc[this.pk] = pkValue;
		}
		Object.defineProperty(doc, 'save', {
			enumerable: false,
			value: (tx?: Queryable) => this.update(pkValue, doc, tx)
		});
		return doc as Doc<T>;
	}

	hydrateAll(rows: Record<string, any>[]): Doc<T>[] {
		return rows.map(r => this.hydrate(r) as Doc<T>);
	}

	// Insert; columns the caller leaves undefined fall back to the table default (ids, sequences, '{}').
	async create(data: Input<T>, tx?: Queryable): Promise<Doc<T>> {
		const cols = this.columns.filter(c => (data as Record<string, unknown>)[c.field] !== undefined);
		const sql = cols.length
			? `INSERT INTO ${this.name} (${cols.map(c => c.field).join(', ')}) VALUES (${cols.map((_, i) => `$${i + 1}`).join(', ')}) RETURNING *`
			: `INSERT INTO ${this.name} DEFAULT VALUES RETURNING *`;
		const result = await (tx ?? db()).query(sql, cols.map(c => this.dbValue(c.kind, (data as Record<string, unknown>)[c.field])));
		return this.hydrate(result.rows[0]) as Doc<T>;
	}

	private async update(pkValue: unknown, doc: Record<string, unknown>, tx?: Queryable): Promise<void> {
		const cols = this.columns.filter(c => doc[c.field] !== undefined);
		const sets = cols.map((c, i) => `${c.field} = $${i + 1}`).join(', ');
		await (tx ?? db()).query(
			`UPDATE ${this.name} SET ${sets} WHERE ${this.pk} = $${cols.length + 1}`,
			[...cols.map(c => this.dbValue(c.kind, doc[c.field])), pkValue]
		);
	}
}
