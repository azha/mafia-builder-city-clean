#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ajoute `angle_deg` aux 18 ancres de district — l'angle de la TRAME de chaque quartier.

⛔ D'OÙ VIENT L'ANGLE, ET POURQUOI PAS D'AILLEURS. La demande disait de le dériver de la SCÈNE
   Blender. Ce n'était pas nécessaire et ç'aurait été moins sûr : l'angle est une valeur
   AUTEURE, écrite dans `atelier3d-mafia/geo_brennar.py`, champ `rot` de chaque quartier —
   `transform="rotate(-10 48.9 70.5)"`. C'est cette valeur que la maquette applique, donc c'est
   elle que le juge a mesurée sur l'image rendue. Re-dériver d'une scène aurait produit un
   SECOND nombre, à comparer au premier, sans autorité supérieure — et un désaccord entre les
   deux n'aurait rien tranché.
   ⇒ Une valeur qui EXISTE en source ne se re-mesure pas : elle se lit.

⛔ ET LE MAPPAGE NE S'INVENTE PAS. Les ancres portent des noms de CODE (`TIDEWATER-1`), la
   maquette affiche des noms de FICTION (`LES BASSINS`) substitués au rendu. `geo_brennar.py`
   porte les deux bouts : le nom de CODE et le `rot`. On joint donc par le nom de code, jamais
   par une correspondance devinée — poser le mauvais angle sur le mauvais district serait pire
   que de n'en poser aucun.

CONVENTION, écrite aussi DANS le fichier produit :
    `angle_deg` est dans la convention de l'IMAGE (celle de SVG et celle du juge) :
      · 0° = horizontale de l'image ;
      · POSITIF = sens HORAIRE (l'axe y descend, comme en SVG et en pixels).
    ⚠️ Unity tourne dans l'autre sens (y monte, positif = trigonométrique) :
      `rt.localRotation = Quaternion.Euler(0, 0, -angle_deg)`.
    Le signe est écrit ici parce qu'un angle sans convention est un nombre sans grandeur — et
    ce dépôt a déjà payé une aiguille inversée qui satisfaisait toutes ses gardes.

⛔ SENTINELLE : refuse plutôt qu'écraser. Un nom d'ancre sans quartier, un quartier sans ancre,
   un `rot` illisible, un compte différent de 18 ⇒ rien n'est écrit. Une ancre à qui on aurait
   posé l'angle du voisin est invisible à la relecture et fausse pour toujours.

Usage : ajouter-angles-districts.py [--ecrire]     (sans --ecrire : contrôle seul)
"""
import json
import os
import re
import sys

ANCRES = os.path.expanduser("~/project/mafia-unity-DA/Assets/Resources/CityMap/ancres_districts.json")
GEO = os.path.expanduser("~/project/atelier3d-mafia/geo_brennar.py")
PAGE = os.path.expanduser("~/project/atelier3d-mafia/ecrans-brennar-6.html")

# Les 7 angles que le juge a mesurés sur l'image rendue — `carte/r1-2026-09-06/rapport.md`, F4.
# ⛔ Ce sont des mesures d'ENCRE, pas la source : elles servent de CONTRÔLE, pas de valeur.
JUGE = {"LES BASSINS": -10.21, "LES FRICHES": -6.38, "QUAI-NORD": -3.51, "MARNE-BASSE": 0.09,
        "HAUTES-MARCHES": 2.86, "SAINT-BRAND": 3.04, "DÉPÔT-EST": 7.23}
TOLERANCE = 1.0     # l'écart admissible entre une valeur auteure et une mesure d'encre


def quartiers():
    """Nom de CODE → (angle, x, y), lus dans la STRUCTURE, pas dans son texte.

    ⛔ Première version en regex : elle rendait ZÉRO quartier, et la sentinelle l'a arrêtée.
       Cause — le champ `rot` contient des guillemets ÉCHAPPÉS
       (`"transform=\\"rotate(-10 …)\\""`), donc un motif `"([^"]*)"` s'arrête au premier `\\"`
       et ne voit jamais le `rotate(`. *Un motif qui rend zéro sur une source qu'on n'a pas lue
       dans sa forme réelle est un faux zéro.* `geo_brennar.py` est du PYTHON : on l'importe et
       on lit la liste, au lieu de deviner sa sérialisation.
    """
    import importlib.util as il
    sp = il.spec_from_file_location("geo", GEO)
    geo = il.module_from_spec(sp)
    sp.loader.exec_module(geo)
    out = {}
    for q in geo.QUARTIERS:
        m = re.search(r"rotate\((-?[\d.]+)", q.get("rot", ""))
        if m:
            out[q["nom"]] = (float(m.group(1)), float(q["x"]), float(q["y"]))
    return out


def noms_de_fiction():
    """(x, y) du texte → nom AFFICHÉ, pour pouvoir confronter au rapport du juge."""
    h = open(PAGE, encoding="utf8", errors="replace").read()
    out = {}
    for x, y, nom in re.findall(r'<text class="nomq" x="([-\d.]+)" y="([-\d.]+)"[^>]*>([^<]+)</text>', h):
        out[(round(float(x), 1), round(float(y), 1))] = nom.strip()
    return out


def main():
    j = json.load(open(ANCRES, encoding="utf8"))
    ancres = j["ancres"]
    q = quartiers()
    fic = noms_de_fiction()

    rouges = []
    if len(ancres) != 18:
        rouges.append("⛔ %d ancres, 18 attendues" % len(ancres))
    if len(q) != 18:
        rouges.append("⛔ %d quartiers lus dans geo_brennar.py, 18 attendus" % len(q))
    sans = [a["nom"] for a in ancres if a["nom"] not in q]
    orph = [n for n in q if n not in {a["nom"] for a in ancres}]
    if sans:
        rouges.append("⛔ ancres sans quartier : %s" % sans)
    if orph:
        rouges.append("⛔ quartiers sans ancre : %s" % orph)
    if rouges:
        print("\n".join(rouges))
        print("Rien écrit — une ancre qui recevrait l'angle du voisin serait fausse pour toujours.")
        sys.exit(1)

    print("%-16s %-20s %9s %9s %9s" % ("ancre", "nom affiché", "angle", "juge", "écart"))
    controles, hors = 0, []
    for a in ancres:
        ang, x, y = q[a["nom"]]
        nom_fic = fic.get((round(x, 1), round(y, 1)), "—")
        ligne = "  %-14s %-20s %9.2f" % (a["nom"], nom_fic, ang)
        if nom_fic in JUGE:
            e = abs(ang - JUGE[nom_fic])
            controles += 1
            ligne += " %9.2f %9.2f %s" % (JUGE[nom_fic], e, "✅" if e <= TOLERANCE else "⛔")
            if e > TOLERANCE:
                hors.append((a["nom"], nom_fic, ang, JUGE[nom_fic], e))
        print(ligne)

    print("\ncontrôle : %d des 7 mesures du juge appariées" % controles)
    if controles != len(JUGE):
        print("⛔ %d mesures du juge non appariées — le contrôle est incomplet, rien écrit."
              % (len(JUGE) - controles))
        sys.exit(1)
    for nom, fi, a, jg, e in hors:
        print("⚠️ %s (%s) : source %.2f, juge %.2f, écart %.2f — DÉSACCORD, à trancher, "
              "la valeur écrite reste celle de la SOURCE" % (nom, fi, a, jg, e))

    if "--ecrire" not in sys.argv:
        print("\n(contrôle seul — relancer avec --ecrire)")
        return

    for a in ancres:
        a["angle_deg"] = q[a["nom"]][0]
    j["angle_convention"] = ("convention de l'IMAGE : 0° = horizontale, POSITIF = sens HORAIRE "
                             "(y descend, comme en SVG et en pixels). ⚠️ Unity tourne à l'inverse : "
                             "rt.localRotation = Quaternion.Euler(0, 0, -angle_deg).")
    j["angle_source"] = ("atelier3d-mafia/geo_brennar.py, champ `rot` de chaque quartier — valeur "
                         "AUTEURE, pas une mesure. C'est elle que la maquette applique et que le "
                         "juge a mesurée sur l'image rendue (F4).")
    json.dump(j, open(ANCRES, "w", encoding="utf8"), ensure_ascii=False, indent=1, sort_keys=False)
    print("\n✅ `angle_deg` écrit sur les 18 ancres, avec sa convention et sa source.")


if __name__ == "__main__":
    main()
