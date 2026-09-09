import sys, math
sys.path.insert(0,'/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/r7-2026-09-06/mesures')
from lib import *

def mask_boxes(key, box, pred, min_px=3):
    """colonnes/lignes occupees par les pixels satisfaisant pred, dans la fenetre CSS box"""
    s=sc(key); im=img(key); d=im.load()
    X0,Y0,X1,Y1=[int(round(v*s)) for v in box]
    cols={}; rows={}; n=0; cols_list=[]
    for yp in range(Y0,Y1):
        for xp in range(X0,X1):
            p=d[xp,yp]
            if pred(p):
                cols[xp]=cols.get(xp,0)+1; rows[yp]=rows.get(yp,0)+1; n+=1
    if not n: return None
    xs=sorted(cols); ys=sorted(rows)
    return dict(n=n, s=s, cols=cols, rows=rows,
                x0=xs[0]/s, x1=(xs[-1]+1)/s, y0=ys[0]/s, y1=(ys[-1]+1)/s,
                w=(xs[-1]+1-xs[0])/s, h=(ys[-1]+1-ys[0])/s)

def profil_lignes(key, box, pred):
    m=mask_boxes(key,box,pred)
    if not m: return None,[]
    s=m['s']; out=[]
    ys=sorted(m['rows'])
    for y in range(ys[0],ys[-1]+1):
        out.append((y/s, m['rows'].get(y,0)))
    return m,out

def profil_colonnes(key, box, pred):
    m=mask_boxes(key,box,pred)
    if not m: return None,[]
    s=m['s']; out=[]
    xs=sorted(m['cols'])
    for x in range(xs[0],xs[-1]+1):
        out.append((x/s, m['cols'].get(x,0)))
    return m,out

def runs(prof, seuil=1):
    out=[]
    for x,n in prof:
        if n>=seuil:
            if out and abs(x-out[-1][1])<1e-6+ (1.0/2.0): pass
        pass
    return out
