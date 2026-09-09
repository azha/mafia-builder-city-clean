# -*- coding: utf-8 -*-
"""CHROME de la capture sous shell : bas du bandeau, haut du dock, gouttiere libre,
et verification que le contenu d'ecran (y=279..2104) n'entre ni sous le bandeau ni sous le dock.
CONTROLE POSITIF : le filet du bandeau doit exister (ligne coloree pleine largeur) — sinon la sonde ment.
CONTROLE NEGATIF : la meme sonde sur la capture ECRAN SEUL (hors shell) ne doit trouver NI bandeau NI dock."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def prof(im,xa,xb):
    px=im.load(); w,h=im.size
    return [sum(lum(px[x,y]) for x in range(xa,xb,3))/len(range(xa,xb,3)) for y in range(h)]
def med(im,x0,y0,x1,y1):
    px=im.load(); ch=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): ch[i].append(p[i])
    return tuple(sorted(c)[len(c)//2] for c in ch)

for f in ("capture-1080x2400.png","capture-ecran-seul-etat-vide-1080x2400.png"):
    im=Image.open(os.path.join(R,f)).convert("RGB"); w,h=im.size
    print("\n### %s %dx%d" % (f,w,h))
    v=prof(im,0,w)
    print("  filet rouge/or y=141 couleur au centre :", med(im,480,140,600,144))
    print("  luminance moyenne par bande de 100 px :")
    for y in range(0,h,100):
        print("     y=%4d..%4d  lum=%6.2f" % (y,min(y+99,h-1), sum(v[y:y+100])/len(v[y:y+100])))
    # dock : cercles bleus
    px=im.load()
    def bleu(p): return p[2]>p[0]+8 and p[2]>=25
    rows=[(y,sum(1 for x in range(0,w,3) if bleu(px[x,y]))) for y in range(h-500,h)]
    on=[y for y,n in rows if n>=40]
    print("  DOCK (lignes a >=40 colonnes 'bleues' sur les 500 derniers px) :",
          (min(on),max(on)) if on else "AUCUNE")
