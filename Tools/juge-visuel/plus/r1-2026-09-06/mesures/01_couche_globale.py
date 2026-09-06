#!/usr/bin/env python3
"""Couche globale : taille, palette quantifiee (% d'aire), luminance moyenne, densite d'encre.
Controle positif : la largeur des deux images DOIT etre 1080 (meme largeur => comparaison en % legitime).
Controle negatif : la hauteur DOIT differer (2102 vs 2400)."""
import os
from PIL import Image

D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
FICH = {
    'REF (serie6 #20)': 'reference-1080x2102.png',
    'JEU (1080x2400)' : 'capture-1080x2400.png',
    'canon serie2'    : 'etats/ecran-canon.png',
}

def lum(px):
    r, g, b = px[:3]
    return 0.2126*r + 0.7152*g + 0.0722*b

for nom, f in FICH.items():
    p = os.path.join(D, f)
    im = Image.open(p).convert('RGB')
    print(f"--- {nom} : {f} taille={im.size}")
    n = im.width*im.height
    q = im.quantize(colors=8, method=Image.MEDIANCUT).convert('RGB')
    hist = q.getcolors(n)
    hist.sort(reverse=True)
    for cnt, col in hist:
        print(f"      {col}  {100.0*cnt/n:5.1f}%")
    small = im.resize((im.width//4, im.height//4))
    ls = [lum(p) for p in small.getdata()]
    moy = sum(ls)/len(ls)
    # densite d'encre = part des pixels > moy+20 (clair sur fond sombre)
    enc = sum(1 for v in ls if v > moy+20)
    print(f"      luminance moyenne = {moy:.1f}/255 ; densite (px > moy+20) = {100.0*enc/len(ls):.1f}%")

# controles
a = Image.open(os.path.join(D,'reference-1080x2102.png'))
b = Image.open(os.path.join(D,'capture-1080x2400.png'))
print(f"CONTROLE POSITIF largeurs egales : {a.width} == {b.width} -> {a.width==b.width}")
print(f"CONTROLE NEGATIF hauteurs differentes : {a.height} != {b.height} -> {a.height!=b.height}")
