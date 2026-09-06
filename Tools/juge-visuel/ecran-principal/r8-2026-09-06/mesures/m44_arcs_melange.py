# -*- coding: utf-8 -*-
"""m44 - les ARCS sont eux aussi translucides : `#7fd4d955` (teal, alpha 0.333) et `#e0664a88`
(braise, alpha 0.533). Meme protocole que m43 : couleur MESUREE au coeur de l'arc, fond = fond du
cadran mesure au MEME rayon 20 deg plus loin dans le vide, et les deux predictions."""
import sys, math, json; sys.path.insert(0,'.')
from commun import *
ANC=json.load(open('ancres.json'))
def lin(v):
    v=v/255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
def srgb(u):
    u=max(0.0,min(1.0,u))
    return (12.92*u if u<=0.0031308 else 1.055*(u**(1/2.4))-0.055)*255.0
def ech(im,f,x,y):
    px=im.load(); X,Y=x*f,y*f; x0,y0=int(X),int(Y); dx,dy=X-x0,Y-y0
    W,H=im.size
    def g(a,b):
        a=min(max(a,0),W-1); b=min(max(b,0),H-1); return px[a,b]
    c00,c10,c01,c11=g(x0,y0),g(x0+1,y0),g(x0,y0+1),g(x0+1,y0+1)
    return tuple((1-dx)*(1-dy)*c00[k]+dx*(1-dy)*c10[k]+(1-dx)*dy*c01[k]+dx*dy*c11[k] for k in range(3))
CAS={'canon':{'teal':(130.0,13.1),'braise':(25.0,14.6),'vide_t':(70.0,13.1),'vide_b':(70.0,14.6)},
     'j1920':{'teal':(130.0,15.3),'braise':(30.0,15.4),'vide_t':(75.0,15.3),'vide_b':(75.0,15.4)},
     'j2400':{'teal':(130.0,15.4),'braise':(30.0,15.4),'vide_t':(75.0,15.4),'vide_b':(75.0,15.4)}}
STROKE={'teal':((127,212,217),0x55/255.0),'braise':((224,102,74),0x88/255.0)}
print("=== m44 : arcs du cadran x deux modeles de melange ===")
print("   NB : dans le jeu la piste neutre traverse l'interstice ; le 'fond' y est donc la PISTE,")
print("   pas le fond nu du cadran. On donne les deux pour le jeu.")
for cle in ['canon','j1920','j2400']:
    im,f=ouvrir(cle); a=ANC[cle]
    print("\n-- %s"%cle)
    for arc in ['teal','braise']:
        ang,r=CAS[cle][arc]
        c=ech(im,f, a['cx']+r*math.cos(math.radians(ang)), a['cy']-r*math.sin(math.radians(ang)))
        c=tuple(round(v) for v in c)
        angv,rv=CAS[cle]['vide_t' if arc=='teal' else 'vide_b']
        fond=ech(im,f, a['cx']+rv*math.cos(math.radians(angv)), a['cy']-rv*math.sin(math.radians(angv)))
        fond=tuple(round(v) for v in fond)
        # fond NU : plus a l'interieur, hors piste (r-5)
        fnu=ech(im,f, a['cx']+(r-5.5)*math.cos(math.radians(ang)), a['cy']-(r-5.5)*math.sin(math.radians(ang)))
        fnu=tuple(round(v) for v in fnu)
        col,al=STROKE[arc]
        for lab,fd in [("fond a l'interstice",fond),("fond NU (r-5.5)",fnu)]:
            ps=tuple(round(al*col[k]+(1-al)*fd[k]) for k in range(3))
            pl=tuple(round(srgb(al*lin(col[k])+(1-al)*lin(fd[k]))) for k in range(3))
            print("   %-6s %-8s : MESURE %-15s fond %-15s (%s) | sRGB %-15s ecart %2d | LIN %-15s ecart %2d  %s"
                  %(cle,arc,str(c),str(fd),lab,str(ps),dist_max(ps,c),str(pl),dist_max(pl,c),
                    "sRGB" if dist_max(ps,c)<dist_max(pl,c) else "LINEAIRE"))
