# -*- coding: utf-8 -*-
"""Extrait les cadres 113..118 de ecrans-brennar-6.html vers mesures/cadre_<n>.html
Contrôle positif : le cadre 113 doit contenir "ce qui s’ouvre, et à quel prix" (l'étiquette du NOMINAL).
Contrôle négatif : le cadre 113 ne doit PAS contenir "rien à l’horizon"."""
import re, os, sys, io

SRC = "/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html"
OUT = os.path.dirname(os.path.abspath(__file__))

data = io.open(SRC, encoding="utf-8").read()
print("source :", SRC, len(data), "caracteres")

# decoupe 0-based sur '<div class="cadre">'
parts = data.split('<div class="cadre">')
print("nb de cadres trouves :", len(parts)-1)

for n in (113, 114, 115, 116, 117, 118):
    body = '<div class="cadre">' + parts[n+1]
    # coupe au cadre suivant s'il y en a un dans le meme bloc
    p = os.path.join(OUT, "cadre_%d.html" % n)
    io.open(p, "w", encoding="utf-8").write(body)
    et = re.search(r'<div class="etiquette">(.*?)</div>', body)
    sub = re.search(r'<div class="enseigne"><b>(.*?)</b><i>(.*?)</i>', body)
    print("cadre %d : %6d car. | etiquette=%r | enseigne=%r / %r" % (
        n, len(body), et.group(1) if et else None,
        sub.group(1) if sub else None, sub.group(2) if sub else None))

c113 = io.open(os.path.join(OUT,"cadre_113.html"), encoding="utf-8").read()
print("CONTROLE POSITIF  cadre113 contient 'ce qui s’ouvre, et à quel prix' :",
      "ce qui s’ouvre, et à quel prix" in c113)
print("CONTROLE NEGATIF  cadre113 contient 'rien à l’horizon' :",
      "rien à l’horizon" in c113)
