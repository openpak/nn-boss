# Protocol: nn-boss

## Tasksheet data URLs

`GET /p01/tasksheet/...` lists the task's files; each `Url` is where the console downloads the
data (`<base>/p01/data/1/<bossAppId>/<dataId>/<hash>`), and on the Wii U the fetch is made by
IOSU (nim-boss), which resolves names through the console's own DNS.

- Default base: `https://` + the first `PN_BOSS_CONFIG_DOMAINS_NPDI` domain.
- Wii U system entrypoint: Inkay-openpak (v0.4.0 and later) sends IOSU traffic to an IP literal,
  and Traefik's `wiiu-system` entrypoint sets `X-OpenPak-Npdi-Base: https://<ip>:<port>` on
  tasksheet requests. That base is used when it is an `https://` IP literal, so the data
  download needs no DNS record either. Any other value is ignored.
