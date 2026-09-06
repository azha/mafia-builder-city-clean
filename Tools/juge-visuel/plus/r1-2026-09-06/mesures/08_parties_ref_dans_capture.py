#!/usr/bin/env python3
"""Les PARTIES de la reference existent-elles dans la capture ?
Masques identiques appliques aux DEUX images, restreints a la zone de CONTENU
(sous le bandeau, au-dessus du bas) ; compte d'aire en % de la zone.
Controle positif : chaque masque doit rendre une aire NON NULLE sur la reference (sinon il ne mesure rien).
Controle negatif : le masque 'creme' sur le bandeau noir de la reference doit rendre ~0."""
import os
from PIL import Image
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"ouvre reference {R.size} / capture {C.size}")
rp,cp=R.load(),C.load()
def creme(c): return c[0]>170 and c[0]>c[2]+25
def orclair(c): return c[0]>140 and c[0]-c[2]>55
def bois(c): return c[0]>60 and c[0]-c[2]>30 and c[0]<175
def vert(c): return c[1]>c[0]+25 and c[1]>c[2]+25 and c[1]>60
MASQUES={'creme (carte)':creme,'or (plaque/badge)':orclair,'bois/acajou':bois,'vert (lampe)':vert}
ZONES={'REF contenu y264..2101':(rp,264,2101,1080),'JEU contenu y144..2399':(cp,144,2399,1080)}
for zn,(px,y0,y1,w) in ZONES.items():
    tot=0; res={k:0 for k in MASQUES}
    for y in range(y0,y1,2):
        for x in range(0,w,2):
            c=px[x,y]; tot+=1
            for k,f in MASQUES.items():
                if f(c): res[k]+=1
    print(f"\n{zn} (echantillon {tot} px)")
    for k in MASQUES: print(f"   {k:22s} {100.0*res[k]/tot:6.2f} %")
# controle negatif
n=0;t=0
for y in range(0,260,2):
    for x in range(0,1080,2):
        t+=1
        if creme(rp[x,y]): n+=1
print(f"\nCONTROLE NEGATIF creme dans le bandeau noir de la REF : {100.0*n/t:.2f} % (attendu ~0, le texte or peut en donner un peu)")
