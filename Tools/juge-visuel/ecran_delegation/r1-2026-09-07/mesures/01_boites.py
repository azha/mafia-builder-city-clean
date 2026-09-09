#!/usr/bin/env python3
"""Detecte les BOITES (jeton, plaques, CTA) par leurs bordures claires, sur une colonne
choisie dans la zone de padding de la boite (pas de texte, pas de 'cro').
Controle positif: la reference DOIT rendre 4 plaques + 1 jeton (source #73, comptees dans le HTML).
Controle negatif: une colonne prise HORS des boites (x=20, marge .serv6) ne doit rendre AUCUNE boite."""
from PIL import Image

D = "/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def bords(path, x, y0, y1, seuil, tag):
    im = Image.open(path).convert("RGB"); W,H = im.size
    print(f"[{tag}] {path.split('/')[-1]} {W}x{H}  colonne x={x} bande y=[{y0},{y1}) seuil={seuil}")
    px = im.load()
    col = [lum(px[x,y]) for y in range(y0,y1)]
    # maxima locaux au-dessus du seuil, regroupes en runs
    runs=[]; cur=None
    for i,v in enumerate(col):
        if v>=seuil:
            if cur is None: cur=[i,i]
            else: cur[1]=i
        else:
            if cur is not None: runs.append(cur); cur=None
    if cur is not None: runs.append(cur)
    out=[]
    for a,b in runs:
        out.append((y0+a, y0+b, round(max(col[a:b+1]),1)))
    return out

if __name__ == "__main__":
    print("=== REFERENCE : colonne x=70 (dans le padding gauche des boites) ===")
    for r in bords(D+"reference-1080x2102.png", 70, 434, 2102, 55, "REF"):
        print(f"   bord y={r[0]}..{r[1]} (ep={r[1]-r[0]+1}px) lum_max={r[2]}")
    print("\n=== CONTROLE NEGATIF : colonne x=20 (hors sv-body, marge .serv6) ===")
    n = bords(D+"reference-1080x2102.png", 20, 434, 2102, 55, "REF-neg")
    print(f"   {len(n)} bord(s) trouve(s) -> attendu 0 ; {n}")
    print("\n=== CAPTURE : colonne x=70 ===")
    for r in bords(D+"capture-1080x2400.png", 70, 150, 2400, 55, "CAP"):
        print(f"   bord y={r[0]}..{r[1]} (ep={r[1]-r[0]+1}px) lum_max={r[2]}")
    print("\n=== CAPTURE CONTROLE NEGATIF : colonne x=20 ===")
    n = bords(D+"capture-1080x2400.png", 20, 150, 2400, 55, "CAP-neg")
    print(f"   {len(n)} bord(s) ; {n}")
