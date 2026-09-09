# m36 — angle de l'aiguille, mesure (pas "vu a l'oeil") : barycentre des pixels creme situes
# entre r=6 et r=16 CSS du moyeu, a l'interieur du boitier. Angle 0 = droite, 90 = haut.
# Controle positif : le canon doit rendre ~ +42 deg a GAUCHE de la verticale (CSS : rotate(-42)).
# Controle negatif : le meme balayage cote braise/teal doit placer teal a gauche, braise a droite.
import sys,math; sys.path.insert(0,'.')
from PIL import Image
from lib import *
CAS=[('canon','../ecran-canon.png',3.0,196.0,43.8),('district','../capture-district-1080x2400.png',2.755,196.0,35.0)]
for name,f,fac,cx,cy in CAS:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size} moyeu ({cx},{cy}) CSS')
    P=[]
    for Y in range(int((cy-20)*fac),int((cy+20)*fac)):
        for X in range(int((cx-20)*fac),int((cx+20)*fac)):
            r=(((X/fac-cx)**2+(Y/fac-cy)**2)**0.5)
            if not (6<=r<=16): continue
            p=px[X,Y]
            if p[0]>180 and p[1]>170 and p[2]>150 and abs(p[0]-p[2])<60:   # creme/blanc
                P.append((X/fac,Y/fac))
    if not P: print('   aucune aiguille detectee'); continue
    bx=sum(a for a,b in P)/len(P); by=sum(b for a,b in P)/len(P)
    ang=math.degrees(math.atan2(cy-by, bx-cx))
    print(f'   n={len(P)} px creme ; barycentre ({bx:.2f},{by:.2f}) ; angle = {ang:.1f} deg (0=droite, 90=haut)')
    print(f'   -> ecart a la verticale = {ang-90:+.1f} deg  ({"a DROITE (chaud)" if ang<90 else "a GAUCHE (froid)"})')
    # ctrl neg : cotes teal / braise
    T=[];B=[]
    for Y in range(int((cy-24)*fac),int((cy+24)*fac)):
        for X in range(int((cx-26)*fac),int((cx+26)*fac)):
            r=(((X/fac-cx)**2+(Y/fac-cy)**2)**0.5)
            if not (10<=r<=26): continue
            p=px[X,Y]
            if p[2]>p[0]+20 and p[1]>80: T.append(X/fac)
            elif p[0]>p[2]+40 and p[0]>110 and p[1]<p[0]-30: B.append(X/fac)
    if T and B:
        print(f'   [ctrl neg] teal barycentre x={sum(T)/len(T):.1f} ; braise barycentre x={sum(B)/len(B):.1f} (moyeu x={cx}) -> teal a {"gauche" if sum(T)/len(T)<cx else "droite"}, braise a {"droite" if sum(B)/len(B)>cx else "gauche"}')
