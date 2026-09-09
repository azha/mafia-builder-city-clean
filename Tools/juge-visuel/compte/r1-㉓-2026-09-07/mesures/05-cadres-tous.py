# -*- coding: utf-8 -*-
"""05 - Le meme defaut de cadre se repete-t-il ? Balaye TOUS les rails horizontaux clairs
de la capture et rend, pour chacun, les segments de trait (L > 60 sur fond 13).
CONTROLE POSITIF : le rail HAUT de la banniere '0 jetons' (bord or) doit sortir CONTINU
(c'est un autre dispositif) -> si tout sortait troue, l'instrument mesurerait autre chose.
CONTROLE NEGATIF : une ligne de fond pur (y=690) doit rendre 0 segment."""
from PIL import Image
im = Image.open('../capture-1080x2400.png').convert('RGB'); print("ouvert", im.size)
w,h = im.size; px = im.load()
def L(x,y):
    r,g,b=px[x,y]; return 0.2126*r+0.7152*g+0.0722*b

def segs_ligne(y, seuil=55, xmin=0, xmax=1080):
    s=[];deb=None
    for x in range(xmin,xmax):
        v = L(x,y)>seuil
        if v and deb is None: deb=x
        if not v and deb is not None:
            if x-deb>=8: s.append((deb,x-1))
            deb=None
    if deb is not None and xmax-deb>=8: s.append((deb,xmax-1))
    return s

# trouver les lignes 'rail' : > 400 px de trait continu-ish
print("--- lignes horizontales de type RAIL (somme des segments > 300 px) ---")
rails=[]
for y in range(300,2100):
    s=segs_ligne(y)
    tot=sum(b-a+1 for a,b in s)
    if tot>300:
        rails.append((y,tot,s))
# regrouper les y consecutifs
groupes=[];cur=[rails[0]] if rails else []
for r in rails[1:]:
    if r[0]-cur[-1][0]<=2: cur.append(r)
    else: groupes.append(cur); cur=[r]
if cur: groupes.append(cur)
for g in groupes:
    y0,y1 = g[0][0], g[-1][0]
    best = max(g, key=lambda r:r[1])
    print("  y=%4d..%4d  (%d px de trait)  segments=%s" % (y0,y1,best[1],best[2]))
print()
print("CONTROLE NEGATIF  y=690 (fond) segments =", segs_ligne(690))
