#!/usr/bin/env python3
# Extrait les cadres 107..112 (et le bloc <style> qui precede le 107) en fichiers separes.
# Equilibrage explicite des <div ...> / </div> : pas de html.parser (piege des balises vides).
import re

SRC = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/vente-35/cloture-2026-11-12/mesures/maquette-a3e02c2a-ecrans-brennar-6.html"
OUT = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/vente-35/cloture-2026-11-12/mesures/"
html = open(SRC, encoding="utf-8").read()

cadres = [m.start() for m in re.finditer(r'<div class="cadre">', html)]
etqs = [(m.start(), re.sub(r"<[^>]+>", "", m.group(1)).strip())
        for m in re.finditer(r'<div class="etiquette">(.*?)</div>', html, re.S)]
assert len(cadres) == len(etqs), "cadres=%d etiquettes=%d" % (len(cadres), len(etqs))

TAG = re.compile(r"</?div\b[^>]*>")


def fin_du_cadre(start):
    depth = 0
    for m in TAG.finditer(html, start):
        depth += 1 if not m.group(0).startswith("</") else -1
        if depth == 0:
            return m.end()
    raise AssertionError("cadre non ferme a %d" % start)


for i in range(107, 113):
    s = cadres[i]
    e = fin_du_cadre(s)
    frag = html[s:e]
    nom = OUT + "M-cadre-%d.html" % i
    open(nom, "w", encoding="utf-8").write(frag)
    print("cadre %d : %d octets, etiquette = %s" % (i, len(frag), etqs[i][1]))

# le <style> de la famille .vnt6, juste avant le cadre 107
sty = html.rfind("<style>", 0, cadres[107])
styend = html.find("</style>", sty) + len("</style>")
open(OUT + "M-style-vnt6.css.html", "w", encoding="utf-8").write(html[sty:styend])
print("style .vnt6 : %d octets (offset %d)" % (styend - sty, sty))
