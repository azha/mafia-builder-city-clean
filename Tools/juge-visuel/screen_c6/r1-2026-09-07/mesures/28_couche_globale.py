# -*- coding: utf-8 -*-
"""COUCHE GLOBALE comparee sur des regions HOMOLOGUES :
  REF  = le panneau .hrz6 y=435..2098 (462 CSS)   |  CAP = le rect d'ecran y=143..2180 (566 CSS)
Palette quantifiee (6), luminance moyenne, densite d'encre, et 'bleuite' moyenne (B-R).
CONTROLE POSITIF : la reference doit rendre une bleuite POSITIVE (fond marine #111823 : B-R = +18).
CONTROLE NEGATIF : la meme mesure sur une image en niveaux de gris construite depuis la reference
   doit rendre une bleuite NULLE — l'instrument doit savoir dire 'pas de bleu'."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def couche(im,box,tag):
    c=im.crop(box); w,h=c.size
    s=c.resize((max(1,w//4),max(1,h//4)),Image.BOX)
    px=list(s.getdata()); n=len(px)
    L=sum(lum(p) for p in px)/n
    bl=sum(p[2]-p[0] for p in px)/n
    enc=sum(1 for p in px if lum(p)>45)/n
    print("  %-34s %s  lum=%6.2f  bleuite(B-R)=%+5.2f  encre(L>45)=%5.2f%%" % (tag,box,L,bl,100*enc))
    q=s.quantize(colors=6,method=Image.MEDIANCUT).convert("RGB")
    for cnt,rgb in sorted(q.getcolors(9999),reverse=True)[:6]:
        print("        %5.1f%%  rgb%-16s #%02x%02x%02x  (B-R=%+d)" % (100.0*cnt/n,str(rgb),rgb[0],rgb[1],rgb[2],rgb[2]-rgb[0]))
ref=Image.open(os.path.join(R,"reference-1080x2102.png")).convert("RGB")
cap=Image.open(os.path.join(R,"capture-1080x2400.png")).convert("RGB")
seul=Image.open(os.path.join(R,"capture-ecran-seul-etat-vide-1080x2400.png")).convert("RGB")
print("ref",ref.size,"cap",cap.size,"seul",seul.size)
couche(ref,(0,435,1080,2098),"REF panneau .hrz6 (#113 nominal)")
couche(cap,(0,143,1080,2180),"CAP rect d'ecran sous chrome")
couche(seul,(0,143,1080,2180),"CAP rect d'ecran (ecran seul)")
print()
gris=ref.convert("L").convert("RGB")
couche(gris,(0,435,1080,2098),"CONTROLE NEGATIF ref en gris")
