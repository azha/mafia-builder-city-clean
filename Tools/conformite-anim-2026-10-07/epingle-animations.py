#!/usr/bin/env python3
"""Épingle « les maquettes ANIMENT » (ruling du 27/08 soir, gel levé le 07/10).

Rougit si, pour ecrans-brennar-6.html :
  1. un @keyframes de la liste REQUISE a disparu (un nettoyage ne retire plus les animations sans que rien ne rougisse) ;
  2. un bloc `animation-play-state:paused` revient (le gel) ;
  3. Chromium (document.getAnimations) mesure moins d'instances EN COURS que le plancher par écran, ou une seule en pause.
Usage : python3 epingle-animations.py <ecrans-brennar-6.html> [--controle]
  --controle : contrôle NÉGATIF — rejoue la mesure sur une copie où le gel est remis ; DOIT rougir (sortie 0 = la copie gelée a bien été refusée).
Sortie 0 = vert.
"""
import json, os, re, subprocess, sys, tempfile, collections

ICI = os.path.dirname(os.path.abspath(__file__))
REQUIS = ("hl sf drip derive led spl respire tg clign bl vp cd fl rl ch ec rd gt po sc pe am ci cl "
          "mk-lampe mk-buee mk-eclat mk-veille mk-scan vnt6-scan hrz6-scan rep6-scan jrn6-scan dos6-scan bln6-scan").split()
# plancher d'instances EN COURS par écran (mesuré le 07/10 : 554 au total) — cadres de ecrans-brennar-6.html
PLANCHER = [
    ("③ carte", list(range(22, 25)), 3), ("② serre", list(range(36, 39)), 276), ("② labo", list(range(39, 45)), 94),
    ("② Ash", list(range(92, 95)), 121), ("㉑ marché", list(range(101, 107)), 26), ("㉟ vente", list(range(107, 113)), 5),
    ("㊱ horizon", list(range(113, 119)), 5), ("㊲ réputation", list(range(119, 125)) + [144], 7),
    ("㊳ journal", list(range(125, 131)) + [145], 6), ("㊴ dossier", list(range(131, 137)) + [143], 6),
    ("㊵ filière", list(range(137, 143)), 5)]

def mesurer(html):
    sortie = tempfile.mktemp(suffix=".json")
    subprocess.run(["node", os.path.join(ICI, "mesurer-maquette.cjs"), html, sortie], check=True, stdout=subprocess.DEVNULL)
    return json.load(open(sortie))["rows"]

def verifier(html):
    src = open(html, encoding="utf-8").read()
    ko = []
    for k in REQUIS:
        if not re.search(r"@keyframes\s+" + re.escape(k) + r"\b", src): ko.append("@keyframes manquant : " + k)
    if "animation-play-state" in src: ko.append("gel présent : animation-play-state")
    rows = mesurer(html)
    paused = sum(1 for r in rows if r["state"] == "paused")
    if paused: ko.append("%d animations en pause" % paused)
    for nom, cad, plancher in PLANCHER:
        n = sum(1 for r in rows if r["cadre"] in cad and r["state"] == "running")
        if n < plancher: ko.append("%s : %d instances en cours < plancher %d" % (nom, n, plancher))
        else: print("OK  %-14s %4d en cours (plancher %d)" % (nom, n, plancher))
    return ko

if __name__ == "__main__":
    html = sys.argv[1]
    if "--controle" in sys.argv:
        src = open(html, encoding="utf-8").read()
        gel = src + "<style>.serre6,.serre6 *,.labo6,.labo6 *,.ecrin6,.ecrin6 *{animation-play-state:paused !important}</style>"
        tmp = tempfile.mktemp(suffix=".html"); open(tmp, "w", encoding="utf-8").write(gel)
        ko = verifier(tmp)
        print("contrôle négatif :", "ROUGE comme attendu (%d motifs)" % len(ko) if ko else "VERT — l'épingle est AVEUGLE")
        sys.exit(0 if ko else 1)
    ko = verifier(html)
    for m in ko: print("ROUGE", m)
    print("épingle :", "ROUGE" if ko else "VERTE")
    sys.exit(1 if ko else 0)
