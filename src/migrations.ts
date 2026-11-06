// Additive schema migrations. Never edit an applied entry: add a new one.
export const migrations: { name: string; sql: string }[] = [
	{
		name: '001_boss_tables',
		sql: `
CREATE SEQUENCE IF NOT EXISTS boss_wup_data_id_seq START 50000; -- starts high to avoid Nintendo data ids
CREATE SEQUENCE IF NOT EXISTS boss_ctr_serial_seq START 50000;

CREATE TABLE IF NOT EXISTS boss_tasks (
	row_id          bigserial PRIMARY KEY,
	deleted         boolean NOT NULL DEFAULT false,
	id              text,
	in_game_id      text,
	boss_app_id     text,
	creator_pid     bigint,
	status          text NOT NULL CHECK (status IN ('open', 'close')),
	interval        integer,
	title_id        text,
	description     text,
	created         bigint,
	updated         bigint,
	legacy_mongo_id text UNIQUE
);
CREATE INDEX IF NOT EXISTS boss_tasks_app_id ON boss_tasks (boss_app_id, id);
CREATE INDEX IF NOT EXISTS boss_tasks_creator ON boss_tasks (creator_pid);

CREATE TABLE IF NOT EXISTS boss_files_wup (
	row_id              bigserial PRIMARY KEY,
	deleted             boolean NOT NULL DEFAULT false,
	file_key            text,
	data_id             bigint NOT NULL DEFAULT nextval('boss_wup_data_id_seq') UNIQUE,
	task_id             text,
	boss_app_id         text,
	supported_countries text[] NOT NULL DEFAULT '{}',
	supported_languages text[] NOT NULL DEFAULT '{}',
	attributes          jsonb NOT NULL DEFAULT '{}'::jsonb,
	creator_pid         bigint,
	name                text,
	type                text,
	hash                text,
	size                bigint,
	notify_on_new       text[] NOT NULL DEFAULT '{}',
	notify_led          boolean,
	condition_played    bigint,
	auto_delete         boolean,
	created             bigint,
	updated             bigint,
	legacy_mongo_id     text UNIQUE
);
CREATE INDEX IF NOT EXISTS boss_files_wup_task ON boss_files_wup (task_id, boss_app_id, name);
CREATE INDEX IF NOT EXISTS boss_files_wup_creator ON boss_files_wup (creator_pid);

CREATE TABLE IF NOT EXISTS boss_files_ctr (
	row_id              bigserial PRIMARY KEY,
	deleted             boolean NOT NULL DEFAULT false,
	creator_pid         bigint,
	hash                text,
	file_key            text,
	size                bigint,
	task_id             text,
	boss_app_id         text,
	supported_countries text[] NOT NULL DEFAULT '{}',
	supported_languages text[] NOT NULL DEFAULT '{}',
	attributes          jsonb NOT NULL DEFAULT '{}'::jsonb,
	name                text,
	serial_number       bigint NOT NULL DEFAULT nextval('boss_ctr_serial_seq') UNIQUE,
	payload_contents    jsonb NOT NULL DEFAULT '[]'::jsonb,
	flags               jsonb NOT NULL DEFAULT '{}'::jsonb,
	created             bigint,
	updated             bigint,
	legacy_mongo_id     text UNIQUE
);
CREATE INDEX IF NOT EXISTS boss_files_ctr_task ON boss_files_ctr (task_id, boss_app_id, name);
CREATE INDEX IF NOT EXISTS boss_files_ctr_creator ON boss_files_ctr (creator_pid);

-- StreetPass mailbox
CREATE TABLE IF NOT EXISTS boss_cec_data (
	id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
	creator_pid     bigint,
	game_id         bigint,
	data            text,
	file_key        text,
	data_hash       text,
	size            integer,
	created         bigint,
	legacy_mongo_id text UNIQUE
);
CREATE INDEX IF NOT EXISTS boss_cec_data_creator ON boss_cec_data (creator_pid, game_id);
CREATE INDEX IF NOT EXISTS boss_cec_data_created ON boss_cec_data (created);

CREATE TABLE IF NOT EXISTS boss_cec_slots (
	id              text PRIMARY KEY DEFAULT gen_random_uuid()::text,
	creator_pid     bigint,
	game_id         bigint,
	latest_data_id  text,
	legacy_mongo_id text UNIQUE
);
CREATE UNIQUE INDEX IF NOT EXISTS boss_cec_slots_owner ON boss_cec_slots (creator_pid, game_id);
CREATE INDEX IF NOT EXISTS boss_cec_slots_latest ON boss_cec_slots (latest_data_id);
`
	}
];
