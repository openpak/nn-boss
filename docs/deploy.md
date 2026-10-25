# Deploy: nn-boss

Fork of Pretendo's `BOSS` (AGPL-3.0), moved to the `account.v2` gRPC contract that OpenPak's
Wii U/3DS adapter ([`nn-account`](../../nn-account)) serves, and pointed at
[`nn-friends`](../../nn-friends). Image: `ghcr.io/openpak/nn-boss` on tag; settings in
`example.env`. The three BOSS keys are console-dumped secrets an operator supplies
privately; without them the service runs but cannot sign SpotPass content.
