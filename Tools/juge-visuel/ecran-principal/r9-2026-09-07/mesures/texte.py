"""Metrique de texte reutilisable : segmentation en glyphes, hauteur de capitale, encre, contraste."""
import math
from commun import *

def metrique(px, sc, x0,x1,y0,y1, nom='', imprime=True, minh=1.0):
    """fenetre en CSS. Fond = mediane de la fenetre. Encre = pixels a >0,012 de luminance du fond."""
    X0,X1,Y0,Y1 = int(x0*sc),int(x1*sc),int(y0*sc),int(y1*sc)
    fond = medrgb(px, X0,Y0,X1,Y1)
    cols={}
    for x in range(X0,X1):
        ys=[y for y in range(Y0,Y1) if abs(lum(px[x,y])-lum(fond))>0.012]
        if ys: cols[x]=(min(ys),max(ys),len(ys))
    if not cols: 
        if imprime: print('      %-26s : AUCUNE ENCRE (fond %s)'%(nom,str(tuple(int(v) for v in fond))))
        return None
    xs=sorted(cols)
    groupes=[]; cur=[xs[0]]
    for x in xs[1:]:
        if x-cur[-1]<=max(1,int(0.6*sc)): cur.append(x)
        else: groupes.append(cur); cur=[x]
    groupes.append(cur)
    gl=[]
    for g in groupes:
        t=min(cols[x][0] for x in g); b=max(cols[x][1] for x in g)
        if (b-t+1)/sc < minh: continue
        gl.append((g[0]/sc,g[-1]/sc,t/sc,b/sc))
    if not gl:
        if imprime: print('      %-26s : glyphes trop petits'%nom)
        return None
    hs=sorted(b-t+1/sc for _,_,t,b in gl)
    cap = hs[int(len(hs)*0.75)] if len(hs)>3 else max(hs)
    enc_pts=[]
    for x in xs:
        for y in range(cols[x][0],cols[x][1]+1):
            c=px[x,y]
            if abs(lum(c)-lum(fond))>0.012: enc_pts.append(c)
    enc_pts.sort(key=lambda c:-abs(lum(c)-lum(fond)))
    top=enc_pts[:max(4,len(enc_pts)//4)]
    enc=tuple(int(med([c[i] for c in top])) for i in range(3))
    res=dict(nom=nom, x0=gl[0][0], x1=gl[-1][1], y0=min(t for _,_,t,_ in gl), y1=max(b for _,_,_,b in gl),
             cap=cap, n=len(gl), encre=enc, fond=tuple(int(v) for v in fond), contraste=contraste(enc,fond))
    if imprime:
        print('      %-26s : %2d glyphes ; x %6.2f..%6.2f (larg %5.2f) ; y %6.2f..%6.2f ; CAPITALE %5.2f CSS ; encre %-16s fond %-16s contraste %5.2f:1'
              % (nom,res['n'],res['x0'],res['x1'],res['x1']-res['x0'],res['y0'],res['y1'],cap,str(enc),str(res['fond']),res['contraste']))
    return res
