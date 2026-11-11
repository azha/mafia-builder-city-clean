#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Q4 — du francais non voulu dans les planches EN ? (hors chrome du shell, qui est hors ㊴)

Instrument : pour un MEME etat et une MEME resolution, on segmente le panneau ㊴ en bandes
d'encre en FR et en EN et on compare, bande a bande, la LARGEUR D'ENCRE.
  - largeur DIFFERENTE  -> la chaine a ete traduite (deux textes differents) ;
  - largeur IDENTIQUE a 2 px pres -> meme trace d'encre : la MEME chaine est affichee dans les
    deux langues, donc non traduite (ou un texte sans mot, comme un chiffre ou un trait).
Chaque bande suspecte est ensuite relue a l'oeil sur l'image (le juge l'a fait).

CONTROLE POSITIF : le titre de l'ecran (« Le dossier » / « The file ») DOIT sortir DIFFERENT —
c'est une chaine dont on sait qu'elle est traduite. S'il sort identique, l'instrument est aveugle.
CONTROLE NEGATIF : les traverses pleine largeur (bordures de plaques, w=960) DOIVENT sortir
identiques dans les deux langues — grandeur dont on sait qu'elle ne depend pas de la langue.
"""
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/39-dossier-nom-lieutenant/fin-ecran-2026-11-11"
X0, X1 = 60, 1020

def lum(p):
    return 0.2126*p[0] + 0.7152*p[1] + 0.0722*p[2]

def bandes(im, y0, y1, seuil=22):
    px = im.load()
    tous = sorted(lum(px[x, y]) for y in range(y0, y1) for x in range(X0, X1, 2))
    fond = tous[len(tous)//4]
    segs, cur = [], None
    for y in range(y0, y1):
        n = sum(1 for x in range(X0, X1) if lum(px[x, y]) - fond > seuil)
        if n >= 3:
            if cur is None: cur = [y, y]
            cur[1] = y
        else:
            if cur is not None and y - cur[1] > 2:
                segs.append(cur); cur = None
    if cur: segs.append(cur)
    out = []
    for sy0, sy1 in segs:
        xs = [x for y in range(sy0, sy1+1) for x in range(X0, X1)
              if lum(px[x, y]) - fond > seuil]
        out.append((sy0, sy1, min(xs), max(xs), max(xs)-min(xs)+1))
    return out

def compare(etat, res, y0, y1):
    a = Image.open(f"{D}/captures/E13_Dossier_{etat}_fr_1080x{res}.png").convert("RGB")
    b = Image.open(f"{D}/captures/E13_Dossier_{etat}_en_1080x{res}.png").convert("RGB")
    print(f"\n### {etat} {res}  TAILLES LUES : fr={a.size}  en={b.size}   bande y[{y0},{y1}]")
    A, B = bandes(a, y0, y1), bandes(b, y0, y1)
    print(f"    {len(A)} bandes en FR, {len(B)} en EN")
    n = min(len(A), len(B))
    for i in range(n):
        ay0, ay1, ax0, ax1, aw = A[i]
        by0, by1, bx0, bx1, bw = B[i]
        if aw >= 900:
            verdict = "traverse (indep. de la langue)"
        elif abs(aw - bw) <= 2 and abs(ax0 - bx0) <= 2:
            verdict = ">>> MEME ENCRE : chaine NON TRADUITE (ou sans mot)"
        else:
            verdict = "traduite"
        print(f"    bande {i:2d}  FR y[{ay0},{ay1}] x[{ax0},{ax1}] w={aw:4d} | "
              f"EN y[{by0},{by1}] x[{bx0},{bx1}] w={bw:4d}   {verdict}")

if __name__ == "__main__":
    for res in (2400, 1920):
        y0, y1 = (530, 2130) if res == 2400 else (430, 1625)
        compare("quiet", res, y0, y1)
        compare("watched", res, y0, y1)
        compare("noticed", res, y0, y1)
