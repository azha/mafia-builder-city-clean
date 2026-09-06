from PIL import Image
def med(v):
    v=sorted(v); n=len(v)
    return v[n//2] if n%2 else (v[n//2-1]+v[n//2])/2
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def srgb2lin(c):
    c=c/255.0
    return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
def relL(p): return 0.2126*srgb2lin(p[0])+0.7152*srgb2lin(p[1])+0.0722*srgb2lin(p[2])
def contrast(a,b):
    la,lb=relL(a)+0.05,relL(b)+0.05
    return max(la,lb)/min(la,lb)
def ink_bbox(px, box, thr, mode='bright', minrun=1):
    """box=(x0,y0,x1,y1) ; renvoie bbox de l'encre + profils"""
    x0,y0,x1,y1=box
    cols=[0]*(x1-x0); rows=[0]*(y1-y0)
    for y in range(y0,y1):
        for x in range(x0,x1):
            L=lum(px[x,y])
            hit = (L>thr) if mode=='bright' else (L<thr)
            if hit:
                cols[x-x0]+=1; rows[y-y0]+=1
    xs=[i for i,c in enumerate(cols) if c>=minrun]
    ys=[i for i,c in enumerate(rows) if c>=minrun]
    if not xs or not ys: return None,cols,rows
    return (x0+xs[0],y0+ys[0],x0+xs[-1]+1,y0+ys[-1]+1),cols,rows
def median_win(px,cx,cy,r=4):
    R=[];G=[];B=[]
    for y in range(cy-r,cy+r+1):
        for x in range(cx-r,cx+r+1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (med(R),med(G),med(B))
