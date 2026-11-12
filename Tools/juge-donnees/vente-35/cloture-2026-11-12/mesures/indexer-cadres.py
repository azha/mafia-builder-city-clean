#!/usr/bin/env python3
# Indexe les cadres de la maquette par leur etiquette. 0-based, comme le dossier.
import re
import sys

SRC = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/vente-35/cloture-2026-11-12/mesures/maquette-a3e02c2a-ecrans-brennar-6.html"
html = open(SRC, encoding="utf-8").read()

etqs = [(m.start(), re.sub(r"<[^>]+>", "", m.group(1)).strip())
        for m in re.finditer(r'<div class="etiquette">(.*?)</div>', html, re.S)]
print("NB_ETIQUETTES=%d" % len(etqs))
if len(sys.argv) > 1 and sys.argv[1] == "--tout":
    for i, (pos, t) in enumerate(etqs):
        print("%3d %8d %s" % (i, pos, t))
else:
    lo, hi = int(sys.argv[1]), int(sys.argv[2])
    for i in range(lo, hi + 1):
        print("%3d %8d %s" % (i, etqs[i][0], etqs[i][1]))
