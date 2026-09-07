# -*- coding: utf-8 -*-
"""Detecte les BORDS des boites : lignes horizontales / colonnes verticales riches en pixels
'clairs vs fond'. Deux familles :
  OR    : R>G>B, R>=90, R-B>=35      (b08d3e / d9ab4e / f2c96b)
  ARDOISE: bleu-gris #2a3648-ish     (B>R, 30<=B<=90, B-R>=10)
CONTROLE POSITIF : sur la REFERENCE, la ligne du bas de l'enseigne (border-bottom 2px #b08d3e)
                   DOIT sortir comme une ligne OR quasi pleine largeur du panneau.
CONTROLE NEGATIF : une bande de fond pur (y=1500..1520 sur la capture ecran-seul) doit rendre ~0.
"""
import os, sys
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)

def isor(p):  return p[0]>p[1]>p[2] and p[0]>=90 and (p[0]-p[2])>=35
def isard(p): return p[2]>p[0] and 30<=p[2]<=95 and (p[2]-p[0])>=10

def scan(path, x0=None, x1=None, seuil=0.35):
    im=Image.open(os.path.join(R,path)).convert("RGB"); w,h=im.size
    print("\n### %s  %dx%d" % (path,w,h))
    if x0 is None: x0,x1=0,w
    px=im.load()
    rows_or=[]; rows_ard=[]
    for y in range(h):
        o=a=0
        for x in range(x0,x1,2):
            p=px[x,y]
            if isor(p): o+=1
            elif isard(p): a+=1
        n=len(range(x0,x1,2))
        rows_or.append(o/n); rows_ard.append(a/n)
    def bandes(v,label):
        out=[];cur=None
        for y,val in enumerate(v):
            if val>=seuil:
                if cur is None: cur=[y,y,val]
                else: cur[1]=y; cur[2]=max(cur[2],val)
            else:
                if cur: out.append(tuple(cur)); cur=None
        if cur: out.append(tuple(cur))
        print("  lignes %s (>= %.0f%% de la largeur) :" % (label,100*seuil))
        for a,b,m in out: print("     y=%4d..%4d  (h=%d)  max=%.2f" % (a,b,b-a+1,m))
        return out
    bo=bandes(rows_or,"OR"); ba=bandes(rows_ard,"ARDOISE")
    return im,bo,ba

if __name__=="__main__":
    scan("reference-1080x2102.png")
    scan("capture-ecran-seul-etat-vide-1080x2400.png")
    scan("capture-1080x2400.png")
    scan("capture-ecran-seul-1080x2400.png")
    scan("capture-ecran-seul-1080x1920.png")
    # controle negatif
    im=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB"); px=im.load()
    c=sum(1 for y in range(1500,1521) for x in range(100,980,2) if isor(px[x,y]))
    print("\nCONTROLE NEGATIF bande de fond y=1500..1520 (capture etat-vide) : %d px OR (attendu ~0)"%c)
