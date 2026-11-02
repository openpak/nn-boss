#!/usr/bin/env python3
"""Find the three BOSS keys in dumped firmware files by MD5.

nn-boss (platforms/wiiu-3ds/infra/nn-boss/src/config-manager.ts) validates the keys it is
given against these MD5s, so any 16-byte window of a dumped file whose MD5 matches IS the key.
Usage: python3 -I find-boss-keys.py <file-or-dir>...   (e.g. nn_boss.rpl, a whole code/ dir,
a decrypted 3DS boss module, or boot9/aeskeydb for the 3DS slot)
"""
import hashlib, os, sys

WANT = {
    "5202ce5099232c3d365e28379790a919": "PN_BOSS_CONFIG_BOSS_WIIU_AES_KEY",
    "b4482fef177b0100090ce0dbeb8ce977": "PN_BOSS_CONFIG_BOSS_WIIU_HMAC_KEY",
    "86fbc2bb4cb703b2a4c6cc9961319926": "PN_BOSS_CONFIG_BOSS_3DS_AES_KEY",
}

def scan(path):
    data = open(path, "rb").read()
    hits = 0
    for n in (16, 32):  # 16-byte AES keys; HMAC key may be 16 or 32 bytes
        for i in range(0, len(data) - n + 1):
            w = data[i:i + n]
            # nn-boss hashes the env var STRING (hex text), so try the hex forms as well as raw bytes
            for form, blob in (("raw", w), ("hex", w.hex().encode()), ("HEX", w.hex().upper().encode())):
                h = hashlib.md5(blob).hexdigest()
                if h in WANT:
                    print(f"{WANT[h]}={w.hex()}  ({path} @0x{i:x}, {n} bytes, matched as {form})")
                    hits += 1
    return hits

def main():
    total = 0
    for arg in sys.argv[1:]:
        if os.path.isdir(arg):
            for root, _, files in os.walk(arg):
                for f in files:
                    total += scan(os.path.join(root, f))
        else:
            total += scan(arg)
    print(f"{total} key(s) found", file=sys.stderr)
    sys.exit(0 if total else 1)

if __name__ == "__main__":
    main()
