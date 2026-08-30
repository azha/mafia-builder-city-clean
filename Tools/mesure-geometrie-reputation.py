#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Géométrie MESURÉE de la maquette ㊲ La réputation (screen_b3), cadres 119-124.

⛔ CE QUE CET INSTRUMENT EXISTE POUR ÉVITER : recopier des hauteurs depuis le générateur
   (`generateur-reputation.py` : H=462, H_FIXE, H_DUO=151…) sans jamais vérifier qu'elles
   décrivent le PNG livré. Le socle a déjà payé le cas inverse — un ratio dérivé puis gelé
   dont le commentaire portait sa propre péremption (« ArcDiameterPx(48)/ManometreDiameter(64) »
   alors que le manomètre était passé à 68). Une grandeur qui existe comme OBJET se mesure
   sur l'objet.

⇒ Ici l'objet est le PNG ratifiable. On mesure les FRONTIÈRES HORIZONTALES réelles (bords des
   blocs, détectés sur la colonne médiane par rupture de luminance) et on les confronte aux
   constantes du générateur. La sortie est collée au commit.

Échelle : les PNG font 900×1752 pour un téléphone `.tel{width:min(300px,88vw);
aspect-ratio:9/17.5}` — donc 300×583,33 px CSS rendus à 3×. `LargeurEcransBrennar = 300f`
existe déjà dans `EchelleMaquette.cs` (même largeur que `ecrans-brennar.html`) — mais c'est
une COÏNCIDENCE de valeur entre deux fichiers distincts, pas une source : ce script la
re-mesure sur la maquette v6 elle-même.

Usage : python3 Tools/mesure-geometrie-reputation.py
"""
import sys
from pathlib import Path

try:
    from PIL import Image
except ImportError:
    sys.exit("PIL requis (numpy n'est pas disponible ici — c'est voulu)")

RACINE = Path(__file__).resolve().parent.parent
PNGS = RACINE / "Tools" / "juge-visuel" / "v6"
CADRES = {119: "canon", 120: "regles", 121: "derive", 122: "gages", 123: "vide", 124: "lots"}

# La maquette, lue à sa source (ecrans-brennar-6.html:24) — pas choisie.
LARGEUR_CSS = 300.0
RATIO = 9.0 / 17.5
HAUTEUR_CSS = LARGEUR_CSS / RATIO  # 583.33…

# Ce que le générateur DÉCLARE (generateur-reputation.py:167,268-269). On les confronte,
# on ne les recopie pas dans le client.
DECLARE = {"H_ecran": 462, "enseigne": 51, "compteurs": 42, "pann": 74, "pied": 46,
           "duo": 151, "regle": 30, "entour": 16}


def luminance(px):
    r, g, b = px[:3]
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def frontieres(im, x_frac=0.5, seuil=9.0):
    """Les y où la luminance de la colonne `x_frac` saute de plus de `seuil`.

    ⚠️ Un balayage sur UNE colonne est aveugle à tout bloc qui ne la traverse pas — c'est
    pourquoi la sortie imprime le COMPTE de frontières par colonne pour trois colonnes
    distinctes : un résultat UNIFORME (même compte partout) est le premier signe que
    l'instrument mesure autre chose que ce qu'on croit (socle : « un instrument qui rend un
    résultat uniforme »)."""
    w, h = im.size
    x = int(w * x_frac)
    px = im.load()
    prec = luminance(px[x, 0])
    out = []
    for y in range(1, h):
        cur = luminance(px[x, y])
        if abs(cur - prec) > seuil:
            out.append(y)
        prec = cur
    return out


def bande_chrome(im):
    """Le chrome du shell (argent / médaillon / jour) occupe le haut ; l'écran commence au
    cerne doré de `.cerne{inset:5px}`. On le trouve par la première ligne où la colonne
    médiane ET les deux tiers latéraux virent ensemble — le liseré traverse toute la largeur."""
    w, h = im.size
    px = im.load()
    for y in range(int(h * 0.10), int(h * 0.40)):
        lum = [luminance(px[int(w * f), y]) for f in (0.08, 0.5, 0.92)]
        prev = [luminance(px[int(w * f), y - 1]) for f in (0.08, 0.5, 0.92)]
        if all(l - p > 6 for l, p in zip(lum, prev)):
            return y
    return None


def main():
    print("=== ÉCHELLE ===")
    print(f"maquette CSS      : {LARGEUR_CSS:.0f} × {HAUTEUR_CSS:.2f} px "
          f"(.tel width:min(300px,88vw); aspect-ratio:9/17.5 — ecrans-brennar-6.html:24)")

    controle_positif = 0
    for num, nom in CADRES.items():
        chemin = PNGS / f"m-{num}.png"
        if not chemin.exists():
            print(f"m-{num}: ABSENT — {chemin}")
            continue
        im = Image.open(chemin).convert("RGB")
        w, h = im.size
        echelle = w / LARGEUR_CSS
        print(f"\n=== m-{num} ({nom}) — {w}×{h} px, échelle {echelle:.3f}× ===")
        if abs(h / echelle - HAUTEUR_CSS) > 2:
            print(f"  ⚠️ hauteur CSS déduite {h/echelle:.2f} ≠ {HAUTEUR_CSS:.2f} attendue")

        y_ecran = bande_chrome(im)
        if y_ecran is None:
            print("  chrome : frontière NON TROUVÉE (l'instrument ne tranche pas ici)")
        else:
            chrome_css = y_ecran / echelle
            corps_css = (h - y_ecran) / echelle
            print(f"  chrome haut : {y_ecran} px image = {chrome_css:.1f} px CSS")
            print(f"  corps écran : {h - y_ecran} px image = {corps_css:.1f} px CSS "
                  f"(générateur déclare H={DECLARE['H_ecran']})")
            if abs(corps_css - DECLARE["H_ecran"]) <= 6:
                controle_positif += 1

        for frac in (0.12, 0.5, 0.88):
            fr = frontieres(im, frac)
            print(f"  frontières colonne x={frac:.2f} : {len(fr)}")

    print(f"\n=== CONTRÔLE ===")
    print(f"cadres dont le corps mesuré tombe à ±6 px CSS de H={DECLARE['H_ecran']} : "
          f"{controle_positif}/{len(CADRES)}")
    print("Un 0/6 réfute la lecture d'échelle ; un 6/6 la confirme sur toute la population.")


if __name__ == "__main__":
    main()
