#!/usr/bin/env python3
"""R2 — CE QUE LE CANON MET AU-DESSUS DU CADRE DE ㊲, ET CE QUE LE JEU Y MET.

Commité avec son verdict : un chiffre dont l'instrument n'est pas dans le dépôt n'est pas une
mesure, c'est un témoignage.

⛔ CE QUE CET INSTRUMENT EXISTE POUR RÉFUTER. Le juge a mesuré « 250 px de bande morte au-dessus
du cadre à 2400, 0 rangée de contenu sur 250 » — c'est EXACT — et en a tiré « un cadre à hauteur
fixe qui n'utilise pas la place du 2400 ⇒ applique le mécanisme du menu Plus, qui remplit sa zone
à 100 % ». La deuxième moitié est une DÉDUCTION, et elle suppose que le canon ne met rien là.
Cet instrument pose la question qui manquait : *que met la RÉFÉRENCE dans cette même bande ?*

⚠️ TROIS GRANDEURS, ET LA PREMIÈRE NE RÉPOND PAS À LA QUESTION.
  1. « rangées sans ENCRE » — une rangée dont aucun pixel ne s'écarte de sa propre médiane.
     ⇒ AVEUGLE ICI : la silhouette de toits du canon est sombre sur fond sombre, et une plaque
       de chrome sans texte est « sans encre » exactement comme un vide. Premier passage : cet
       instrument rendait « 0 px de bande morte » sur les TROIS images — un verdict UNIFORME,
       donc un instrument qui mesure autre chose.
  2. « ruptures de médiane par rangée » — trouve les bords de plaque, pas le dessin.
  3. ★ « TRANSITIONS HORIZONTALES par rangée » — le nombre de fois où deux pixels voisins
     diffèrent de |Δ| ≥ 12 en somme des canaux. Un aplat ou un dégradé vertical en rend ZÉRO ;
     un dessin en rend d'autant plus qu'il a de bords. **C'est la seule des trois qui sépare
     « rien n'est peint » de « ce qui est peint est sombre ».**

⛔ ET SES DEUX CONTRÔLES NE SONT PAS OPTIONNELS — le premier passage a montré pourquoi :
  contrôle POSITIF  l'intérieur du cadre, dont on SAIT qu'il porte du dessin  ⇒ doit rendre ≫ 0
                    tenu sur les TROIS plaques : 44,1 · 42,9 · 45,3
  contrôle NÉGATIF  les rangées de tête, aplat sur les plaques de JEU        ⇒ 0,00 · 0,00
⚠️ Et il faut dire ce qu'il ne fait pas : sur la RÉFÉRENCE le contrôle négatif est CONTAMINÉ
  (12,88) — le coin arrondi du bandeau atteint la 2ᵉ rangée. Il n'y prouve donc rien. Le « 2,00 »
  du canon ne s'appuie que sur le contrôle POSITIF, qui, lui, tient sur les trois.
Sans eux, un « 0,00 » se lit comme une mesure alors qu'il peut être un instrument mort.

    python3 Tools/mesure-bande-hors-cadre.py
"""
import sys
from PIL import Image

OR = (191, 150, 67)          # le filet doré du cadre, la seule ancre commune aux deux images
TOL = 34                     # tolérance par canal, mesurée sur les deux plaques
SEUIL_TRANSITION = 12        # somme des trois canaux entre deux pixels voisins


def cadre(chemin):
    """Rangées du filet doré : (première, dernière). L'ancre est le DESSIN, pas une cote."""
    im = Image.open(chemin).convert('RGB')
    w, h = im.size
    px = im.load()
    par_rangee = []
    for y in range(h):
        n = sum(1 for x in range(0, w, 4)
                if all(abs(px[x, y][i] - OR[i]) <= TOL for i in range(3)))
        par_rangee.append(n)
    seuil = max(par_rangee) * 0.5
    ys = [y for y, n in enumerate(par_rangee) if n >= seuil]
    return ys[0], ys[-1]


def derniere_encre(chemin, ymax):
    """Dernière rangée AU-DESSUS de `ymax` portant de l'encre — le bas du contenu du bandeau."""
    im = Image.open(chemin).convert('RGB')
    w, h = im.size
    px = im.load()
    dernier = 0
    for y in range(ymax):
        row = [px[x, y] for x in range(w)]
        m = w // 2
        med = (sorted(p[0] for p in row)[m], sorted(p[1] for p in row)[m], sorted(p[2] for p in row)[m])
        if sum(1 for p in row
               if abs(p[0] - med[0]) + abs(p[1] - med[1]) + abs(p[2] - med[2]) > 60) >= 8:
            dernier = y
    return dernier


def transitions(chemin, y0, y1):
    """Transitions horizontales par rangée : la grandeur qui distingue un DESSIN d'un dégradé."""
    im = Image.open(chemin).convert('RGB')
    w, _ = im.size
    px = im.load()
    total = 0
    for y in range(y0, y1):
        prec = px[0, y]
        for x in range(1, w):
            c = px[x, y]
            if abs(c[0] - prec[0]) + abs(c[1] - prec[1]) + abs(c[2] - prec[2]) >= SEUIL_TRANSITION:
                total += 1
            prec = c
    return total / max(1, y1 - y0)


PLAQUES = [
    ("RÉFÉRENCE (canon)", "Tools/juge-visuel/reputation/reference-1080x2102.png"),
    ("JEU 1080×2400 sous chrome", "Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x2400.png"),
    ("JEU 1080×1920 sous chrome", "Assets/Screenshots/screen_b3_reputation_sous_chrome_1080x1920.png"),
]


def main():
    for nom, chemin in PLAQUES:
        im = Image.open(chemin)
        w, h = im.size
        css = h / 3.5993                      # l'échelle de la maquette, la même sur les trois
        haut, bas = cadre(chemin)
        enc = derniere_encre(chemin, haut)
        print(f"\n=== {nom} — {w}×{h} ({css:.1f} CSS) ===")
        print(f"  cadre (filet doré)        y {haut}..{bas}   h = {bas - haut} px = {(bas - haut) / 3.5993:6.1f} CSS")
        print(f"  au-dessus du cadre                        {haut} px = {haut / 3.5993:6.1f} CSS")
        print(f"  sous le cadre                             {h - bas} px = {(h - bas) / 3.5993:6.1f} CSS")
        print(f"  dernière encre du bandeau y {enc}")
        print(f"  ⇒ BANDE entre le bandeau et le cadre      {haut - enc} px = {(haut - enc) / 3.5993:6.1f} CSS")
        t = transitions(chemin, enc + 12, haut - 7)
        print(f"  ⇒ DESSIN dans cette bande : {t:6.2f} transitions/rangée")
        print(f"     contrôle POSITIF (dans le cadre)  : {transitions(chemin, haut + 220, haut + 420):6.2f}")
        print(f"     contrôle NÉGATIF (le fond du haut) : {transitions(chemin, 2, 10):6.2f}")


if __name__ == '__main__':
    sys.exit(main())
