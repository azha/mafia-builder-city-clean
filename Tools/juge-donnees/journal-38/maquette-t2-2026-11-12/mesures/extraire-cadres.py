#!/usr/bin/env python3 -I
"""Extrait les 6 cadres du journal (indices 0-based reperes par le LIBELLE de l'etiquette).

Sortie : cadre-<idx>.html (HTML brut du cadre) + cadre-<idx>.txt (texte visible, balises vides
ignorees cf. lecon « parseur de maquette : balises vides »).
Contr. positif : le libelle relu dans le fichier extrait doit egaler le libelle cherche.
"""
import html as H
import os
import re
import sys

OUT = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(OUT, "maquette-a3e02c2a.html")
s = open(SRC, encoding="utf-8").read()

LIBELLES = [
    "Le journal — ce qui se dit ce matin",
    "Le journal — après « Y PRÊTER ATTENTION » · bande full",
    "Le journal — après « Y PRÊTER ATTENTION » · bande reduced",
    "Le journal — après « Y PRÊTER ATTENTION » · bande minimal",
    "Le journal — après « Y PRÊTER ATTENTION » · bande none",
    "Le journal — les trois fraîcheurs",
]

etq = list(re.finditer(r'<div class="etiquette"[^>]*>(.*?)</div>', s, re.S))
print("nb etiquettes dans la page = %d" % len(etq))
labels = [H.unescape(re.sub(r"<[^>]+>", "", m.group(1))).strip() for m in etq]


def cadre_span(pos):
    """Du <div class=\"cadre\"...> qui precede `pos` jusqu'a sa fermeture equilibree."""
    start = s.rfind('<div class="cadre"', 0, pos)
    assert start != -1
    depth = 0
    for m in re.finditer(r"<div\b[^>]*>|</div>", s[start:]):
        depth += 1 if m.group(0).startswith("<div") else -1
        if depth == 0:
            return start, start + m.end()
    raise AssertionError("div non equilibre")


found = {}
for lib in LIBELLES:
    idxs = [i for i, l in enumerate(labels) if l == lib]
    if len(idxs) != 1:
        print("ERREUR : libelle %r trouve %d fois" % (lib, len(idxs)), file=sys.stderr)
        sys.exit(2)
    i = idxs[0]
    a, b = cadre_span(etq[i].start())
    frag = s[a:b]
    open(os.path.join(OUT, "cadre-%d.html" % i), "w", encoding="utf-8").write(frag)
    # texte visible : on insere un separateur a CHAQUE balise (y compris vides) pour ne pas
    # coller deux textes voisins, puis on compacte.
    txt = re.sub(r"<[^>]+>", "\n", frag)
    txt = H.unescape(txt)
    txt = "\n".join(l.strip() for l in txt.splitlines() if l.strip())
    open(os.path.join(OUT, "cadre-%d.txt" % i), "w", encoding="utf-8").write(txt)
    # CONTROLE POSITIF : le libelle doit se relire dans le fragment extrait
    relu = re.search(r'<div class="etiquette"[^>]*>(.*?)</div>', frag, re.S)
    relu = H.unescape(re.sub(r"<[^>]+>", "", relu.group(1))).strip()
    ok = relu == lib
    print("cadre %3d  %-62s  octets=%6d  libelle relu OK=%s" % (i, lib[:62], len(frag), ok))
    if not ok:
        sys.exit(3)
    found[i] = lib

# CONTROLE NEGATIF : un libelle qui n'existe pas doit echouer (teste hors boucle)
faux = "Le journal — cadre qui n'existe pas"
print("controle negatif : libelle absent trouve %d fois (attendu 0)" % labels.count(faux))
assert labels.count(faux) == 0
print("indices extraits :", sorted(found))
