# Wii U/3DS BOSS Server

OpenPak's Wii U/3DS BOSS Server.

| | |
| --- | --- |
| Network | Wii U, 3DS |
| Role | BOSS (Background Online Storage Service): SpotPass content, tasksheets and policy files, and the optional Streetpass relay |
| Depends on | [`nn-account`](https://github.com/openpak/nn-account), [`nn-friends`](https://github.com/openpak/nn-friends), MongoDB, S3 or disk storage |
| Image | `ghcr.io/openpak/nn-boss` |
| Based on | [Pretendo `BOSS`](https://github.com/PretendoNetwork/BOSS) (AGPL-3.0) |
| Licence | AGPL-3.0-only |

## What it serves

| Function | What |
| --- | --- |
| SpotPass (3DS) | Background content delivery for 3DS |
| Tasksheets and policy files | For Wii U and 3DS |
| Streetpass relay | Optional, toggled by `PN_BOSS_CONFIG_STREETPASS_RELAY_ENABLED` |
| Management gRPC | Task and file management for the `boss` CLI |

## Run

```sh
cp example.env .env   # fill in the keys and secrets first
npm run build
npm start
```

## Docs

- [Protocol](docs/protocol.md)
- [Evidence](docs/evidence.md)
- [Deploy](docs/deploy.md)
- [Notes](docs/notes.md)
- [Upstream README](docs/upstream.md)
- [Docs index](docs/README.md)

## Licence

AGPL-3.0-only. See [LICENSE](LICENSE).
