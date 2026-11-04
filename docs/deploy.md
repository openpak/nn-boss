# Deploy: nn-boss

Fork of Pretendo's `BOSS` (AGPL-3.0), moved to the `account.v2` gRPC contract that OpenPak's
Wii U/3DS adapter ([`nn-account`](../../nn-account)) serves, and pointed at
[`nn-friends`](../../nn-friends). Image: `ghcr.io/openpak/nn-boss` on tag; settings in
`example.env`. The three BOSS keys are console-dumped secrets an operator supplies
privately; without them the service runs but cannot sign SpotPass content.

## Dumping the keys

The Wii U AES and HMAC keys live in the firmware's BOSS library, `nn_boss.rpl`, in the OS title on the
MLC (`/storage_mlc/sys/title/00050010/1000400a/code/`). Fetch that folder with ftpiiu (Aroma, with
system-file access enabled in the plugin menu) and run:

    python3 -I tools/find-boss-keys.py <code dir or nn_boss.rpl>

It scans every 16- and 32-byte window against the three MD5s `config-manager.ts` checks and prints the
env values. The 3DS key is found the same way in a decrypted 3DS `boss` module or key-table dump.


## Account erasure

`DELETE /internal/accounts/{account_id}/data` with `Authorization: Bearer $ACCOUNT_ERASE_KEY`, on a separate
listener `ERASE_ADDR` (default `:9099`; container network only, never published). It answers
`{"service":"nn-boss","rows":N}`. Without `ACCOUNT_ERASE_KEY`, or without
`PN_BOSS_CONFIG_OPEN_PAK_CORE_HOST`/`_PORT`/`_KEY` (the core's internal gRPC, as for nn-friends), it is not served.

The account's PIDs are the wiiu/3ds links the core holds plus the PID nn-account resolves, so the website must
erase nn-boss before nn-account and before the core finalises. Erased: the StreetPass mailbox (`CECData` and its
stored payloads, `CECSlot`). Kept: tasks and SpotPass files, which are operator-published content; their
`creator_pid` is set to 0. Repeat calls return 0 rows. `npm test` runs the unit tests; the Mongo test runs when
`PN_BOSS_TEST_MONGO_URL` is set.
