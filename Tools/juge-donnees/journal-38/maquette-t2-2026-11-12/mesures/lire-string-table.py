#!/usr/bin/env python3 -I
"""Lit le string_table.ts du CUMUL 44a645a2 et rend, par prefixe, les cles servies EN et FR.

Parse volontairement naif mais CONTROLE : chaque registre est delimite par sa ligne
`export const XX_MESSAGES` et la premiere ligne `};` en colonne 0 qui suit ; une cle est
une ligne `  'xxx':`. Controle positif/negatif en fin de script.
"""
import json
import os
import re
import subprocess
import sys

OUT = os.path.dirname(os.path.abspath(__file__))
SHA = "44a645a286cbd3c982d500fe0a590230dd6d8c80"
REPO = "/home/erutheone/project/mafia-clean-city"

src = subprocess.run(
    ["git", "-C", REPO, "show", "%s:services/game-back/src/i18n/string_table.ts" % SHA],
    capture_output=True, text=True, check=True).stdout
lines = src.splitlines()
open(os.path.join(OUT, "string_table-cumul-44a645a2.ts"), "w", encoding="utf-8").write(src)


def registry(name):
    start = next(i for i, l in enumerate(lines) if l.startswith("export const %s_MESSAGES" % name))
    end = next(i for i in range(start + 1, len(lines)) if lines[i] == "};")
    d = {}
    i = start + 1
    while i < end:
        m = re.match(r"\s{2}'((?:[^'\\]|\\.)*)':\s*(.*)$", lines[i])
        if m:
            key = m.group(1)
            val = m.group(2)
            j = i + 1
            # valeur sur plusieurs lignes / concatenations : on agrege jusqu'a la prochaine cle
            while j < end and not re.match(r"\s{2}'((?:[^'\\]|\\.)*)':", lines[j]) and not lines[j].strip().startswith("//"):
                val += " " + lines[j].strip()
                j = i = j
                j += 1
            d[key] = val.rstrip().rstrip(",")
        i += 1
    return d, start, end


EN, ens, ene = registry("EN")
FR, frs, fre = registry("FR")
print("EN_MESSAGES lignes %d..%d -> %d cles" % (ens + 1, ene + 1, len(EN)))
print("FR_MESSAGES lignes %d..%d -> %d cles" % (frs + 1, fre + 1, len(FR)))

# CONTROLE POSITIF : une cle connue, citee par le code (ambient-attend-view.ts:25)
for k in ("ambient.apres_assister.full",):
    assert k in EN and k in FR, "CONTROLE POSITIF ECHOUE sur %s" % k
    print("controle positif  %-34s EN=%s | FR=%s" % (k, EN[k][:40], FR[k][:40]))
# CONTROLE NEGATIF : une cle qui ne doit pas exister
assert "ambient.apres_assister.inexistante" not in EN
print("controle negatif  'ambient.apres_assister.inexistante' absent : OK")

json.dump({"EN": EN, "FR": FR}, open(os.path.join(OUT, "string-table-extrait.json"), "w", encoding="utf-8"),
          indent=1, ensure_ascii=False, sort_keys=True)

PREFIXES = sys.argv[1:] or ["ambient.", "news_beat.frame_tag.", "press.outlet."]
for p in PREFIXES:
    ks = sorted(k for k in set(EN) | set(FR) if k.startswith(p))
    print("\n===== prefixe %r : %d cles =====" % (p, len(ks)))
    for k in ks:
        print("  %-52s EN=%-46s FR=%s" % (k, repr(EN.get(k))[:46], repr(FR.get(k))[:70]))
