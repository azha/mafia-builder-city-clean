# -*- coding: utf-8 -*-
"""Cherche les libelles VUS SUR LA CAPTURE dans TOUTE la source de l'atelier (serie 6 + chassis).
Controle POSITIF : 'ce que le serveur ne dit pas' DOIT sortir >0 (c'est le sous-titre du cadre 116).
Controle NEGATIF : une chaine inventee doit sortir 0."""
import io
SRC = ["/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html",
       "/home/erutheone/project/atelier3d-mafia/chassis6.py"]
blobs = {p: io.open(p, encoding="utf-8", errors="replace").read() for p in SRC}
for p,b in blobs.items(): print("lu :", p, len(b), "caracteres")
print()
VUS = [
 ("sous-titre capture", "ce que le serveur ne dit pas"),
 ("bloc capture",       "chelle des paliers"),
 ("bloc capture",       "Palier 2"),
 ("bloc capture",       "Palier3"),
 ("ligne capture",      "ne dit pas ce qui manque pour y arriver"),
 ("pann capture i",     "ce que le serveur envoie vraiment"),
 ("pann capture b",     "Rien a l'horizon (sans accent, forme capture)"),
 ("pann capture b2",    "Rien à l'horizon"),
 ("pann capture small", "ce n'est pas une panne"),
 ("pann capture small2","aucune capacité pour l'instant"),
 ("maquette 117 rien",  "Rien ne s’ouvre pour l’instant"),
 ("maquette 117 pann",  "Les cartes viennent du monde, pas du menu"),
 ("CTA nominal",        "prendre — 3 jetons"),
 ("note nominale",      "carte est"),
 ("CONTROLE NEGATIF",   "zzz-chaine-qui-nexiste-pas-zzz"),
]
for tag, m in VUS:
    tot = sum(b.lower().count(m.lower()) for b in blobs.values())
    print("%-22s %-52s -> %d" % (tag, repr(m)[:52], tot))
