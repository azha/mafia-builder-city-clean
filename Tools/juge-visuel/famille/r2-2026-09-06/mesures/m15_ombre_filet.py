# m15 — (a) OMBRE PORTEE sous un rang, mesuree A PARTIR de 1,5 CSS sous le bord (le px 0..1 est le
#           lisere interne bas 'inset 0 -1px rgba(0,0,0,.5)', un AUTRE dispositif) ;
#       (b) EXTINCTION du filet de tete : luminance le long du filet, en % de sa demi-largeur.
# Controle : la ligne de base est le fond de feuille mesure a 25 CSS sous le rang (hors portee).
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
RANG={'REF':(629.5,728.5),'JEU':(264.3,363.8)}
print('\n=== (a) OMBRE PORTEE (0 4px 12px #000a) ===')
for S in (R,C):
    top,bot=RANG[S['nom']]; im=S['im'].load()
    base=lum(mediane(S,290,bot+24,320,bot+28))
    vals=[]
    d=1.5
    while d<=16.0:
        x,y=P(S,300,bot+d); vals.append((d,lum(im[int(round(x)),int(round(y))])-base)); d+=0.5
    creux=min(vals,key=lambda t:t[1])
    portee=max([d for d,v in vals if v<-2.0]+[0])
    print(f'  {S["nom"]}: fond de reference {base:.1f}/255 ; creux {creux[1]:+.1f} a {creux[0]:.1f} CSS ; portee (|delta|>2) {portee:.1f} CSS')
    print('     ', ' '.join(f'{d:.1f}:{v:+.0f}' for d,v in vals[:20]))
print('\n=== (b) FILET DE TETE : profil horizontal (CSS x -> exces de luminance sur le fond) ===')
FIL={'REF':115.0,'JEU':128.75}
for S in (R,C):
    yc=FIL[S['nom']]; im=S['im'].load()
    base=lum(mediane(S,270,yc-6,290,yc-3))
    out=[]
    for xc in range(10,551,5):
        x,y=P(S,xc,yc); out.append((xc,lum(im[int(round(x)),int(round(y))])-base))
    print(f'  {S["nom"]} (y CSS {yc}, fond {base:.1f}) :')
    print('     ', ' '.join(f'{xc}:{v:+.0f}' for xc,v in out if xc<=290))
    # valeurs demandees : a 8 % et 12 % de la largeur de feuille, et au plateau (centre)
    def at(xc):
        x,y=P(S,xc,yc); return lum(im[int(round(x)),int(round(y))])-base
    print(f'      a 8 % (x=44,8) {at(44.8):+.0f} · a 12 % (x=67,2) {at(67.2):+.0f} · plateau (x=280) {at(280):+.0f}')
    xs=[xc for xc,v in out if v>10]
    print(f'      bornes du filet a +10/255 : x {xs[0]}..{xs[-1]} CSS (longueur {xs[-1]-xs[0]})')
