# -*- coding: utf-8 -*-
"""m09 — moitie basse : verdict, tuiles (textes), carte portrait (libelles), .pann, .cta6.
Meme instrument que m08 (bbox d'encre + couleur du coeur du glyphe).
Contrôle positif : 'fen span' mesure identique des deux cotes en m08 (233/234 px).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
R=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
C=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF %dx%d  CAP %dx%d'%(R.size+C.size))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def mesure(im,box,seuil):
    px=im.load();x0,y0,x1,y1=box;pts=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]
            if lum(c)>=seuil: pts.append((x,y,c))
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    pts.sort(key=lambda p:-lum(p[2])); top=pts[:max(1,len(pts)//7)]
    med=tuple(sorted(t[2][k] for t in top)[len(top)//2] for k in range(3))
    return dict(x0=min(xs),x1=max(xs),y0=min(ys),y1=max(ys),w=max(xs)-min(xs)+1,h=max(ys)-min(ys)+1,col=med)
def duo(nom,bR,bC,s=95):
    a=mesure(R,bR,s); b=mesure(C,bC,s)
    if not a or not b:
        print('%-30s REF=%s CAP=%s'%(nom,a,b)); return
    print('%-30s h REF %3d(%5.2f) CAP %3d(%5.2f) %+6.1f%% | w REF %4d CAP %4d %+6.1f%% | y REF %d..%d CAP %d..%d | x0 REF %4d CAP %4d | col REF %s CAP %s'
          %(nom,a['h'],a['h']/3.6,b['h'],b['h']/3.6,100*(b['h']-a['h'])/a['h'],a['w'],b['w'],100*(b['w']-a['w'])/a['w'],
            a['y0'],a['y1'],b['y0'],b['y1'],a['x0'],b['x0'],a['col'],b['col']))
# position verticale des valeurs de compteurs (dont le tiret)
duo('fen b 3 (00 / tiret)',(700,700,1020,780),(700,490,1025,570),95)
duo('fen b 1 (00)',(56,700,360,780),(50,490,365,570),95)
print()
# verdict
duo('verdict b "Pas encore jugeable"',(540,880,760,960),(530,660,760,745),95)
duo('verdict span "ce qu il a..."',(760,880,1000,960),(760,660,1010,740),70)
print()
# tuiles : titre + sous-titre (tuile 2 = manches basses, OFF des deux cotes)
duo('tl2 b "manches basses"',(575,1120,1000,1170),(560,880,1010,930),95)
duo('tl2 small "la justice..."',(575,1165,1000,1210),(560,925,1010,962),70)
duo('tl4 b "gants sales"',(575,1350,1000,1400),(560,1095,1010,1145),95)
duo('tl4 small "la discretion..."',(575,1395,1000,1442),(560,1140,1010,1177),70)
print()
# carte portrait
duo('prt i "LT. X, VOTRE LIEUTENANT"',(90,900,500,960),(80,690,495,745),70)
duo('prt b "Il vous ecoute"',(90,1420,500,1470),(80,1190,495,1240),95)
print()
# panneau bas
duo('pann i "PAS JUGEABLE..."',(70,1660,1020,1700),(60,1470,1025,1510),70)
duo('pann b "Rien n a encore deteint"',(70,1700,1020,1770),(60,1510,1025,1580),95)
duo('cta6 "DONNER UNE PREMIERE REGLE"',(70,1960,1020,2040),(60,1765,1025,1840),95)
