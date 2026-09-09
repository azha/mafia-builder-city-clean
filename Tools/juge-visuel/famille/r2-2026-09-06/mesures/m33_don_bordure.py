# m33 — BORDURE du rang du Don : couleur sur les QUATRE cotes.
# La CSS ne donne au .don-rang qu'un 'border:1px solid #d9ab4e44' — aucun lisere blanc interne
# (contrairement a .rang qui porte 'inset 0 1px rgba(255,255,255,.15)').
# CONTROLE : on mesure aussi le bord haut d'un RANG, ou le lisere blanc EXISTE des deux cotes.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
def bordure(S,nom,ytop,ybot,xg,xd):
    im=S['im'].load()
    def au(xc,yc):
        return im[int(round(P(S,xc,0)[0])),int(round(P(S,0,yc)[1]))]
    h=au(300,ytop); b=au(300,ybot); g=au(xg,(ytop+ybot)/2); d=au(xd,(ytop+ybot)/2)
    print(f'  {S["nom"]} {nom:12s} haut {str(h):>15} (R-B {h[0]-h[2]:+3d})  bas {str(b):>15} (R-B {b[0]-b[2]:+3d})'
          f'  gauche {str(g):>15} (R-B {g[0]-g[2]:+3d})  droite {str(d):>15} (R-B {d[0]-d[2]:+3d})')
print('\n=== SUJET : rang du Don ===')
bordure(R,'don-rang',135.1,236.6,22.6,537.1)
bordure(C,'don-rang',148.5,249.5,22.4,537.2)
print('\n=== CONTROLE : un rang ordinaire (lisere blanc interne attendu en HAUT des deux cotes) ===')
bordure(R,'rang3',629.6,728.4,48.7,536.9)
bordure(C,'rang1',264.4,363.7,48.6,537.4)
