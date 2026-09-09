# -*- coding: utf-8 -*-
"""Bases : taille des images, palette quantifiee, luminance moyenne, densite d'encre.
CONTROLE POSITIF : la largeur des 4 captures et de la reference doit valoir 1080 (echelle posee par le dossier).
CONTROLE NEGATIF : les HAUTEURS doivent differer (2102 vs 2400 vs 1920) — un instrument qui rend tout egal ment."""
import os
from PIL import Image
D = os.path.dirname(os.path.abspath(__file__)); R = os.path.dirname(D)
F = {
 "REF   #113 nominal"   : "reference-1080x2102.png",
 "CAP   etat-vide+chrome": "capture-1080x2400.png",
 "CAP   etat-vide seul" : "capture-ecran-seul-etat-vide-1080x2400.png",
 "CAP   non declare 2400": "capture-ecran-seul-1080x2400.png",
 "CAP   non declare 1920": "capture-ecran-seul-1080x1920.png",
}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for k,v in F.items():
    im = Image.open(os.path.join(R,v)).convert("RGB")
    w,h = im.size
    small = im.resize((w//6, h//6), Image.BOX)
    px = list(small.getdata()); n=len(px)
    L = sum(lum(p) for p in px)/n
    encre = sum(1 for p in px if lum(p) > 40)/n
    q = small.quantize(colors=6, method=Image.MEDIANCUT).convert("RGB")
    cols = sorted(q.getcolors(4096), reverse=True)[:6]
    print("%-24s %s  %4dx%4d  lum_moy=%6.2f  encre(L>40)=%5.1f%%" % (k, v, w, h, L, 100*encre))
    for c,rgb in cols:
        print("        %5.1f%%  rgb%s" % (100.0*c/n, rgb))
print()
print("CONTROLE POSITIF largeurs :", [Image.open(os.path.join(R,v)).size[0] for v in F.values()], "(attendu 5x 1080)")
print("CONTROLE NEGATIF hauteurs :", [Image.open(os.path.join(R,v)).size[1] for v in F.values()], "(doivent differer)")
