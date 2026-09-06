from common import *
def encre(im,box,seuil=None,clair=True):
    """bbox de l'encre dans box ; seuil auto = fond median + 25 (clair) """
    px=im.load(); x0,y0,x1,y1=box
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//2]
    s = base+ (25 if seuil is None else seuil)
    pts=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if (lum(px[x,y])>s)==clair and abs(lum(px[x,y])-base)>(25 if seuil is None else seuil)]
    if not pts: return None,base,s
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    return (min(xs),min(ys),max(xs),max(ys)),base,s
def colonnes(im,box,seuil=25):
    """profil : pour chaque x, y ink present ? -> segments de mots/lettres"""
    px=im.load(); x0,y0,x1,y1=box
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    base=sorted(vals)[len(vals)//2]
    cols=[]
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])-base>seuil]
        cols.append((x,ys))
    return cols,base
def segments(cols,gap=1,minw=1):
    segs=[];cur=None;last=None
    for x,ys in cols:
        if ys:
            if cur is None: cur=[x,x]
            elif x-cur[1]<=gap: cur[1]=x
            else: segs.append(tuple(cur)); cur=[x,x]
    if cur: segs.append(tuple(cur))
    return [s for s in segs if s[1]-s[0]+1>=minw]
