# m12 — HALO du medaillon du Don (.medl.don{box-shadow:0 0 14.93px #d9ab4e33}).
# Methode : profil radial vers la GAUCHE depuis le centre du medaillon, au-dela de l'anneau ;
# on integre l'exces du canal R sur la ligne de base (le fond du rang au meme y, pris a 60 CSS a droite du disque).
# CONTROLE NEGATIF : le meme instrument sur un medaillon de LIEUTENANT (pas de box-shadow) doit rendre ~0.
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def halo(S,cx,cy,r_anneau,label):
    im=S['im'].load()
    # ligne de base : mediane du fond du rang a la meme hauteur, loin du disque
    base=mediane(S,cx+120,cy-6,cx+170,cy+6)
    prof=[]; t=0.0
    while t<=12.0:
        xc=cx-r_anneau-1.5-t
        x,y=P(S,xc,cy)
        c=im[int(round(x)),int(round(y))]
        prof.append((round(t,2),c[0]-base[0]))
        t+=0.5
    integ=sum(max(0,d) for t,d in prof)*0.5
    pic=max(d for t,d in prof)
    print(f'  {label:34s} base {base}  integrale exces R = {integ:6.1f} /px CSS  pic {pic:+3d}  portee~{max([t for t,d in prof if d>=2]+[0]):.1f} CSS')
    print(f'      profil (t CSS: dR) {" ".join(f"{t:.0f}:{d:+d}" for t,d in prof[:25:2])}')
print('\n=== HALO — medaillon du DON (attendu : present des deux cotes) ===')
halo(R,77.5,171.0,35.5,'REF don')
halo(C,76.6,184.9,35.1,'JEU don')
print('\n=== CONTROLE NEGATIF — medaillon de LIEUTENANT (aucun box-shadow) ===')
halo(R,100.8,302.8,35.5,'REF lieutenant rang1')
halo(C,100.5,314.0,35.4,'JEU lieutenant rang1')
