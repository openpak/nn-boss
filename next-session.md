# Next session — nn-boss
Updated 2026-09-15.

Pretendo's BOSS fork on the `account.v2` gRPC contract: SpotPass on 3DS,
tasksheets and policy files for both consoles, StreetPass relay. Content
lives in MongoDB plus S3 (MinIO in prod; `PN_BOSS_CONFIG_CDN_DISK_PATH` is
the disk alternative), seeded from `seeding/` (`npm run cli -- import seed`).
Deployed 2026-09-10 (HTTP 20080 behind Traefik), not console-verified.

## Where things stand

- One OpenPak commit over upstream: 21b383a (account.v2 contract, tag-driven
  ghcr release, example.env) = v0.1.0 = HEAD. No OpenPak code changes since.
- example.env wires the OpenPak topology: account gRPC at
  openpak-nn-account:20051, friends at openpak-nn-friends:20061, own task/file
  gRPC on 20081, and the console-facing domains as Nintendo's own names on
  OpenPak (`npdi.cdn.nintendowifi.net`, `npdl`, `npfl`, `nppl`, `npts`,
  `service.spotpass.nintendowifi.net`) — the README table's pretendo.cc
  defaults are overridden by env. StreetPass relay enabled.
- The blocker (WU-3 / DS3-5): three console-dumped keys — Wii U AES + HMAC,
  3DS AES (BetterKeyDumper). Without them the service runs but signs nothing:
  no SpotPass content can be delivered at all.
- `seeding/`: tasksheets for known apps (Splatoon rotations
  bb6tOEckvgZ50ciH / rjVlM7hUXPxmYQJh / zvGSM4kOrXpkKnpT, Miiverse
  wood/olvinfo, more) plus pre-encrypted content files. Seeding is
  idempotent and only adds or updates.
- Dirty tree: only the untracked docs effort (`CHANGELOG.md`, `docs/`,
  `prds/`) — no code changes.

## Open questions

- Are the BOSS keys obtainable? If not, C9 becomes "not applicable, and here
  is why" (platform-wiiu-prd §6) rather than an open milestone.

## Next steps

1. Dump the three keys from a console, set them in prod, sign and deliver one
   SpotPass item — DoD is "it arrives on a console" (WU-3 / DS3-5).
2. Once a console can be pointed at the family, verify the np* / spotpass
   names route through Traefik to this service and a tasksheet fetch works
   end to end.
3. Refresh `seeding/` content (Splatoon rotations go stale) before any
   delivery test that reads it.

## Pointers

- README.md (config tables, CLI usage), example.env, seeding/README.md
- ../prds/platform-wiiu-prd.md (C9, WU-3), ../prds/platform-3ds-prd.md (DS3-5)
- ../nn-account, ../nn-friends (the two gRPC dependencies)

## Scratch (research and throwaway work)

Decompiles, Ghidra projects, dumps, exefs/romfs extracts, packet captures,
strace and emulator logs, probe harnesses: put them in
`~/REPOS/Openpak/scratch/<topic>`. That folder is a local mount of the media pool,
outside every repository, so nothing in it is committed. Never use `/tmp` (a
shared 15 GB RAM disk) or elsewhere on `/home` for this. Keys and signing
material never go there. Rule: `docs/playbooks/conventions.md` in the workspace.
