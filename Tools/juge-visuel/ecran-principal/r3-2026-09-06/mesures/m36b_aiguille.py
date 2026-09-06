# m36b — angle de l'aiguille. m36 etait CONTAMINE : le texte du medaillon (creme) tombe dans
# l'anneau de recherche. Ici on borne a y < moyeu_y + 3 CSS (au-dessus du moyeu), ce qui exclut
# "Brulant" (y 44.28..52.63) cote jeu. Cote CANON le texte "37%" (y 31.67..45.33) recouvre la zone
# de l'aiguille : je NE mesure PAS l'angle du canon, il est donne par la CSS (rotate(-42 30 34),
# soit 42 deg a GAUCHE de la verticale) -- et je le dis plutot que d'inventer un chiffre.
import sys,math; sys.path.insert(0,'.')
from PIL import Image
from lib import *
print("canon : angle NON mesurable a l'image (le texte '37%' recouvre l'aiguille) ; CSS = rotate(-42) => 42 deg a GAUCHE de la verticale, cote teal.")
for name,f,fac,cx,cy in [('district','../capture-district-1080x2400.png',2.755,196.0,35.0),
                         ('fiche19','../capture-fiche-1080x1920.png',2.755,196.0,35.0)]:
    im=Image.open(f).convert('RGB'); px=im.load(); print(f'== {name} {im.size} moyeu ({cx},{cy}) CSS')
    P=[]
    for Y in range(int((cy-20)*fac),int((cy+3)*fac)):
        for X in range(int((cx-20)*fac),int((cx+20)*fac)):
            r=(((X/fac-cx)**2+(Y/fac-cy)**2)**0.5)
            if not (5<=r<=18): continue
            p=px[X,Y]
            if p[0]>190 and p[1]>180 and p[2]>160 and abs(p[0]-p[2])<60: P.append((X/fac,Y/fac,r))
    if not P: print('   rien'); continue
    bx=sum(a for a,b,c in P)/len(P); by=sum(b for a,b,c in P)/len(P)
    ang=math.degrees(math.atan2(cy-by,bx-cx))
    tip=max(P,key=lambda t:t[2])
    print(f'   n={len(P)} ; barycentre ({bx:.2f},{by:.2f}) -> {ang:.1f} deg ; pointe la plus lointaine ({tip[0]:.1f},{tip[1]:.1f}) a r={tip[2]:.1f} CSS')
    print(f'   -> ecart a la verticale = {ang-90:+.1f} deg  ({"DROITE = cote braise (chaud)" if ang<90 else "GAUCHE = cote teal (froid)"})')
