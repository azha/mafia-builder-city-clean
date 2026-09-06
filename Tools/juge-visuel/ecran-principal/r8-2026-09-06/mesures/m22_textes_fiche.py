# -*- coding: utf-8 -*-
"""m22 - bandes de texte de la fiche : rythme vertical, hauteurs de CAPITALE, etendue horizontale.
Hauteur de capitale = hauteur d'encre d'un glyphe SANS jambage ni accent (on prend la MEDIANE des
hauteurs des colonnes d'encre continues les plus frequentes). Origine : le haut de la plaque
(canon 424.52 ; jeu 425.39 a 1920 et 599.61 a 2400) -> tout est exprime en OFFSET dans la plaque."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
TOP={'canon':424.52,'j1920':425.39,'j2400':599.61}
PL ={'canon':(13.0,379.0),'j1920':(11.98,379.66),'j2400':(11.98,379.66)}

def bandes(cle, seuil=90):
    im,f=ouvrir(cle,taire=True); px=im.load()
    t=TOP[cle]; x0,x1=PL[cle]
    prof=[]
    for yy in range(int(t*f),int((t+172)*f)):
        n=sum(1 for xx in range(int((x0+4)*f),int((x1-4)*f)) if max(px[xx,yy])>=seuil)
        prof.append((yy/f-t, n/f))
    # runs ou n > 1.5 CSS de largeur d'encre
    r=[];deb=None
    for i,(o,n) in enumerate(prof):
        if n>1.5 and deb is None: deb=o
        elif n<=1.5 and deb is not None:
            if o-deb>1.0: r.append((deb,o)); 
            deb=None
    if deb is not None: r.append((deb,prof[-1][0]))
    return r

def cap(cle, o0,o1, x0=None,x1=None, seuil=110):
    """hauteur de capitale : mode des hauteurs de run vertical d'encre par colonne."""
    im,f=ouvrir(cle,taire=True); px=im.load()
    t=TOP[cle]; a,b=(PL[cle] if x0 is None else (x0,x1))
    hs=[]; xs=[]
    for xx in range(int((a+3)*f),int((b-3)*f)):
        col=[yy for yy in range(int((t+o0)*f),int((t+o1)*f)) if max(px[xx,yy])>=seuil]
        if not col: continue
        xs.append(xx/f)
        runs=[];d=None
        for k in range(int((t+o0)*f),int((t+o1)*f)):
            on = max(px[xx,k])>=seuil
            if on and d is None: d=k
            elif not on and d is not None: runs.append((k-d)/f); d=None
        if d is not None: runs.append((int((t+o1)*f)-d)/f)
        if runs: hs.append(max(runs))
    if not hs: return None
    from collections import Counter
    q=Counter(round(h*8)/8.0 for h in hs)
    return q.most_common(3), (min(xs),max(xs)), len(hs)

print("=== m22 : textes de la fiche ===")
for cle in ['canon','j1920','j2400']:
    ouvrir(cle)
    r=bandes(cle)
    print("\n-- %s : bandes d'encre (offset CSS depuis le haut de la plaque) :"%cle)
    for a,b in r: print("     %6.2f .. %6.2f   (h %.2f)"%(a,b,b-a))
print("""
Canon (mesure-canon.txt / source) : .titre a +14.00 (40.73 de haut), .stats a +64.73 (37.64),
.actions a +114.37 (39.81). Le canon met `.fiche .titre .serif` a 16px et `.type` a 9px.""")
