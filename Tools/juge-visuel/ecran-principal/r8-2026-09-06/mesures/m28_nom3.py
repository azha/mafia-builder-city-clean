# -*- coding: utf-8 -*-
"""m28 - nom du district : contraste ENCRE/FOND avec un fond pris HORS du texte, a la meme
hauteur (x 46..120 CSS = le fond pose, sans glyphe) -- c'est le fond que l'oeil voit derriere
le mot. Encre = coeur des glyphes (min(canal) > 150). On donne aussi le PIRE CAS par colonne,
et la valeur DANS LA BANDE DE FONDU du bas du fond pose.
CONTROLE : la meme sonde sur le titre de la fiche (encre or-vif sur plaque) doit rendre > 10:1."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
print("=== m28 : contraste du nom du district ===")
Y0,Y1=86.0,94.0
for cle in ['j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    enc=[px[xx,yy] for yy in range(int(Y0*f),int(Y1*f)) for xx in range(int(4*f),int(41*f)) if min(px[xx,yy])>150]
    ce=tuple(int(mediane([c[k] for c in enc])) for k in range(3))
    fond=[px[xx,yy] for yy in range(int(Y0*f),int(Y1*f)) for xx in range(int(46*f),int(120*f))]
    cf=tuple(int(mediane([c[k] for c in fond])) for k in range(3))
    print("\n-- %s : encre du nom %s (%d px) | fond pose a la MEME hauteur, hors texte %s (%d px)"
          %(cle,ce,len(enc),cf,len(fond)))
    print("   CONTRASTE = %.2f:1   (doctrine : petit texte >= 4.5:1 ; capitale ~4.8 CSS)"%contraste(ce,cf))
    # pire cas colonne par colonne : fond = mediane locale non-encre, fenetre +-2.5 CSS
    pires=[]
    for xc in [x/2.0 for x in range(8,82)]:
        e=[px[xx,yy] for yy in range(int(Y0*f),int(Y1*f)) for xx in range(int((xc-1)*f),int((xc+1)*f)) if min(px[xx,yy])>150]
        b=[px[xx,yy] for yy in range(int(Y0*f),int(Y1*f)) for xx in range(int((xc-2.5)*f),int((xc+2.5)*f)) if max(px[xx,yy])<105]
        if len(e)<8: continue
        ce2=tuple(int(mediane([c[k] for c in e])) for k in range(3))
        pires.append((contraste(ce2,cf),xc))
    pires.sort()
    print("   par colonne (fond pose commun) : pire %.2f:1 (x=%.1f) | median %.2f:1"%(pires[0][0],pires[0][1],mediane([p[0] for p in pires])))
    # bande de fondu : le bas du fond pose (y 96..99) -- l'encre y descend-elle ?
    n=sum(1 for yy in range(int(95*f),int(100*f)) for xx in range(int(4*f),int(41*f)) if min(px[xx,yy])>150)
    print("   encre dans la bande de fondu du fond pose (y 95..100) : %d px"%n)
    for yb in [95.0,97.0,99.0,101.0]:
        cb=tuple(int(mediane([px[xx,int(yb*f)][k] for xx in range(int(46*f),int(120*f))])) for k in range(3))
        print("      fond a y=%.0f : %s -> contraste avec l'encre %.2f:1"%(yb,cb,contraste(ce,cb)))
print("\n[CONTROLE POSITIF] la meme sonde sur le TITRE de la fiche (or-vif sur la plaque) doit rendre > 10:1 :")
for cle,(a,b) in [('j1920',(444.0,460.0)),('j2400',(618.0,634.0))]:
    im,f=ouvrir(cle,taire=True); px=im.load()
    e=[px[xx,yy] for yy in range(int(a*f),int(b*f)) for xx in range(int(30*f),int(360*f))
       if (px[xx,yy][0]-px[xx,yy][2])>=60 and px[xx,yy][0]>=150]
    fo=[px[xx,yy] for yy in range(int(a*f),int(b*f)) for xx in range(int(30*f),int(360*f)) if max(px[xx,yy])<55]
    if not e or not fo:
        print("   %-6s : encre %d px / fond %d px -> fenetre a revoir"%(cle,len(e),len(fo))); continue
    ce=tuple(int(mediane([c[k] for c in e])) for k in range(3))
    cf=tuple(int(mediane([c[k] for c in fo])) for k in range(3))
    print("   %-6s : encre %s (%d px) / fond %s (%d px) = %.2f:1"%(cle,ce,len(e),cf,len(fo),contraste(ce,cf)))
