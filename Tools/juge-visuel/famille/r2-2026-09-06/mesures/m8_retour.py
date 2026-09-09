# m8 — BOUTON RETOUR : profil horizontal a travers le centre, energie de trait de l'anneau,
# contraste anneau/fond, remplissage interne, chevron.
# Controle positif : le meme profil, pris a 90 CSS a droite (hors bouton), doit rendre une energie ~0.
import sys,os; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
CY={'REF':53.0,'JEU':None}
print('\n--- centre vertical du bouton : ligne ou l\'anneau est le plus large ---')
def profil(S,yc,x0=15,x1=95):
    im=S['im'].load(); out=[]
    n=int((x1-x0)*S['f'])
    for i in range(n):
        xc=x0+i/S['f']
        x,y=P(S,xc,yc)
        out.append((xc,im[int(round(x)),int(round(y))]))
    return out
def energie(S,yc,fond,x0=15,x1=95):
    """somme des exces de luminance sur le fond, par px CSS"""
    tot=0.0
    pr=profil(S,yc,x0,x1)
    for xc,c in pr:
        d=lum(c)-lum(fond)
        if d>0: tot+=d
    return tot/S['f']
for S in (R,C):
    im=S['im'].load()
    best=None
    for yc in [y/4 for y in range(120,300)]:
        pr=profil(S,yc,15,95)
        xs=[xc for xc,c in pr if lum(c)>lum(mediane(S,120,45,140,60))+8]
        if xs:
            larg=xs[-1]-xs[0]
            if best is None or larg>best[1]: best=(yc,larg)
    CY[S['nom']]=best[0]
    print(f'{S["nom"]}: ligne la plus large a y CSS {best[0]:.2f}, largeur {best[1]:.2f}')
print('\n--- profil a travers le centre (CSS x, RGB) — bord gauche de l\'anneau ---')
for S in (R,C):
    yc=CY[S['nom']]
    fond=mediane(S,110,45,150,62)
    print(f'{S["nom"]} (y={yc:.2f}, fond local {fond}) :')
    pr=profil(S,yc,20,36)
    print('   ', ' '.join(f'{xc:.1f}:{lum(c):.0f}' for xc,c in pr))
    pic=max(lum(c) for xc,c in pr)
    print(f'    pic anneau (gauche) = {pic:.0f} ; fond = {lum(fond):.0f} ; contraste anneau/fond = {contraste(max(pr,key=lambda t:lum(t[1]))[1],fond):.2f}:1')
    print(f'    energie de trait par px CSS (x 15..95, exces sur fond) = {energie(S,yc,fond):.1f}')
    # controle positif : meme mesure 90 CSS a droite (aplat de tete)
    print(f'    CONTROLE (bande vide x 200..280, meme y) = {energie(S,yc,fond,200,280):.1f}')
    # remplissage interne
    print(f'    remplissage interne (mediane x 40..70 autour du centre) = {mediane(S,40,yc-3,70,yc+3)}  vs fond {fond}')
