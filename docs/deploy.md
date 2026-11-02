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

