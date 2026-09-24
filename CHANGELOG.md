# Changelog — nn-boss

Generated from git history on 2026-09-15. `git log` stays the source
of truth; this file is the readable summary.

Note: the early history below is the upstream project (Pretendo);
OpenPak work starts at the port/fork commit.

## v0.1.1 — 2026-09-24

- deps: npm audit fix (axios, mongoose, undici, protobufjs, grpc-js, qs, …) and a scoped js-yaml override (Dependabot)

## v0.1.0 — 2026-09-10

- OpenPak fork: account.v2 contract, tag-driven ghcr release, example.env [21b383a]
- Merge branch 'master' of github.com:PretendoNetwork/BOSS [2ebe0f2]
- fix: handle errors with proper process exit [e545d16]
- Merge pull request #46 from PretendoNetwork/dev [e1f49bb]
- Merge pull request #45 from DaniElectra/npfl-attribute-search [7f841de]
- fix(database) Fix FileCTR attribute search [06c6371]
- Merge pull request #44 from PretendoNetwork/dev [57af042]
- Merge pull request #41 from PretendoNetwork/chore/grpc-2.2.4 [3291696]
- chore: update max send/receive grpc size config option names in the README [fa186e5]
- fix(grpc): Mongoose FileCTR.create needs an array when using transactions [b1f648a]
- feat(grpc): allow the send/receive message sizes to be customized [a950197]
- fix(cli): Allow download of files with no payload content [c17b68c]
- feat(3ds): Add support for no payload contents [f3c57f9]
- chore: Update pretendonetwork/boss-crypto to 1.2.2 [17bdbb2]
- feat(npdl): Support edge cases for country and language-specific files [ce8f6a1]
- feat: Store task interval [35f23f7]
- chore: Update pretendonetwork/grpc to 2.3.5 [f3f895e]
- feat(cli): Implement 3DS support [90f02ac]
- feat(cli): Update to gRPC v2 [dd8ef4d]
- fix(grpc/v1): Populate attributes on UploadFile [767730e]
- chore: Update pretendonetwork/grpc to 2.3.4 [18b7179]
- chore: remove BigInt casts in ListKnownBOSSApps gRPC methods [6f8ae94]
- chore: convert FileWUP model to use the same attribute structure as the FileCTR model [7843355]
- chore: update @typegoose/auto-increment [e1bb1b2]
- fix(grpc/v2): Fix PIKMIN 3 name on EUR and JPN [9917326]
- feat(npts): Implement attributes mode [257ef94]
- feat(boss/v2): Expand list of known apps [43f03c8]
- fix(database): Search for no countries or languages if not specified [4d266e3]
- fix(npfl): Query files from FileCTR [3a55e46]
- chore: update @pretendonetwork/boss-crypto and @pretendonetwork/grpc [3bf0334]
- fix: npm run lint:fix [92f9c09]
- feat: full upgrade to boss grpc v2 [4c07a01]
- chore: npm audit fix [436a8ed]
- chore: bump @pretendonetwork/boss-crypto [9be53c0]
- chore: bump @pretendonetwork/grpc [0078fbf]
- feat: begin gRPC 2.2.4 port. missing CTR [4186968]
- fix: update cli create command to use bigint title ID [22f3016]
- feat: port original BOSS gRPC implementation into v1 folder [1f54552]
- Merge branch 'master' into dev [e66bc81]
- Merge pull request #40 from PretendoNetwork/feat/etags [848988c]

- … 227 earlier commits omitted (see `git log`)
