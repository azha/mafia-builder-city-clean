# m13 — RAYON DES COINS : ajustement du profil du coin haut-gauche des panneaux.
# Le meme instrument tourne des deux cotes (discriminant B-R>=10 sur le degrade du panneau).
# Controle positif : le rayon ajuste sur la REFERENCE doit approcher la valeur CSS 22.4.
import sys,os,math; sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
R,C=charger()
BOITES={'REF':[('don-rang',23.5,136.0),('rang1',48.5,252.5),('rang2',48.5,454.5),('rang3',48.5,629.5)],
        'JEU':[('don-rang',23.9,150.0),('rang1',48.4,264.3),('rang2',48.4,465.9),('rang3',48.4,667.4)]}
def inset(S,x0,ytop,d):
    """inset horizontal du bord gauche du panneau, d CSS sous son bord haut"""
    im=S['im'].load(); y=int(round(P(S,0,ytop+d)[1]))
    for i in range(0,int(40*S['f'])):
        x=int(round(P(S,x0,0)[0]))+i
        c=im[x,y]
        if c[2]-c[0]>=10: return i/S['f']
    return None
def rayon(S,x0,ytop):
    pts=[]
    d=1.0
    while d<=16.0:
        v=inset(S,x0,ytop,d)
        if v is not None: pts.append((d,v))
        d+=0.5
    best=(1e9,None)
    r=8.0
    while r<=32.0:
        err=0.0; n=0
        for d,v in pts:
            if d<r:
                pred=r-math.sqrt(max(0.0,r*r-(r-d)**2))
                err+=(pred-v)**2; n+=1
        if n>=8:
            e=err/n
            if e<best[0]: best=(e,r)
        r+=0.1
    return best[1], best[0], pts[:8]
for S in (R,C):
    print(f'\n===== {S["nom"]} =====')
    for nom,x0,ytop in BOITES[S['nom']]:
        r,e,pts=rayon(S,x0,ytop)
        print(f'  {nom:9s} rayon ajuste = {r:.1f} CSS (erreur {e:.2f}) ; insets d->v {[(d,round(v,2)) for d,v in pts]}')
