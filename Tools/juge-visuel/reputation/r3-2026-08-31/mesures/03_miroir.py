# -*- coding: utf-8 -*-
"""03 — LE BLOC MIROIR : boîte du cadre doré du portrait (.prt), boîtes des 4 tuiles (.tl),
et le VIDE laissé sous chacun à l'intérieur du cadre élastique (.elast).
Repères : origine = coin haut-gauche du cerne (REF 18,377 · CAP 18,19) ; échelles /3,0 et /3,6.
Le cerne étant doré lui aussi, il est exclu : on ne balaye qu'entre elast_haut et elast_bas.
Contrôle positif : largeur de .prt = 118 px CSS (valeur écrite dans la CSS `.prt{width:118px}`).
Contrôle négatif : la hauteur de .prt ne PEUT pas être identique dans les deux images
(align-items:stretch + cernes de 452 vs 523 CSS) — un « égal » dénoncerait l'instrument."""
from PIL import Image

def gold(p):
    r,g,b=p[:3]; return r>110 and r-b>55 and g>80 and b<120
def runs(vals,o):
    out,s=[],None
    for i,v in enumerate(vals):
        if v and s is None: s=i
        elif not v and s is not None: out.append((s+o,i-1+o)); s=None
    if s is not None: out.append((s+o,len(vals)-1+o))
    return out
def col(im,x,y0,y1,p): px=im.load(); return runs([p(px[x,y]) for y in range(y0,y1)],y0)
def row(im,y,x0,x1,p): px=im.load(); return runs([p(px[x,y]) for x in range(x0,x1)],x0)
def lum(p): return .2126*p[0]+.7152*p[1]+.0722*p[2]
def marches(im,x,y0,y1,s=6):
    """frontières = pas de luminance ; rend (y, sens, delta)."""
    px=im.load(); L=[lum(px[x,y]) for y in range(y0,y1)]; o=[]
    for i in range(1,len(L)):
        d=L[i]-L[i-1]
        if abs(d)>s: o.append((y0+i, '+' if d>0 else '-', round(d,1)))
    return o

CAS=[('REF','/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',
      3.0,18,377,881,708,1341,820),
     ('CAP','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',
      3.6,18,19,1061,410,1367,985),
     ('CAP2400','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x2400.png',
      3.6,18,18,1061,410,1847,985)]
for nom,path,sc,cx0,cy0,cx1,eh,eb,xt in CAS:
    im=Image.open(path).convert('RGB'); print('='*76); print(nom,path.split('/')[-1],im.size)
    C=lambda v:v/sc; ry=lambda y:(y-cy0)/sc; rx=lambda x:(x-cx0)/sc
    ys=(eh+eb)//2
    g=[r for r in row(im,ys,cx0+30,cx1-30,gold) if r[1]-r[0]<9]
    px0,px1=g[0][0],g[-1][1]
    print(' .elast : %.1f .. %.1f CSS (hauteur %.1f)'%(ry(eh),ry(eb),C(eb-eh)))
    print(' .prt  x = %.1f .. %.1f CSS | largeur %.1f CSS  (CSS declaree 118)'%(rx(px0),rx(px1),C(px1-px0+1)))
    gv=[r for r in col(im,(px0+px1)//2,eh+2,eb-2,gold) if r[1]-r[0]<9]
    ty,by=gv[0][0],gv[-1][1]
    print(' .prt  y = %.1f .. %.1f CSS | HAUTEUR %.1f CSS'%(ry(ty),ry(by),C(by-ty+1)))
    print('   VIDE sous .prt dans .elast = %.1f CSS'%C(eb-by))
    print(' tuiles .tl — marches de luminance colonne x=%d :'%xt)
    for y,s,d in marches(im,xt,eh+3,eb-1):
        print('    y=%4d %s%-6.1f -> %6.1f CSS'%(y,s,d,ry(y)))
