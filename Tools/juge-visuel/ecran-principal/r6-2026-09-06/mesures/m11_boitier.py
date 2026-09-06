# m11 — boitier du medaillon : centre, rayon, epaisseur du cerclage (NOMINALE mi-amplitude + COEUR >=90% du pic)
from lib import *
def gold(im,x,y):
    r,g,b=im.getpixel((int(x),int(y))); return r-b

def segs_on(vals,idx,thr):
    out=[];cur=None
    for i,v in enumerate(vals):
        if v>=thr and cur is None: cur=i
        if v<thr and cur is not None: out.append((cur,i)); cur=None
    if cur is not None: out.append((cur,len(vals)))
    return out

def sub(vals,i0,i1,thr):
    v0,v1=vals[i0],vals[i1]
    return i0 if v1==v0 else i0+(thr-v0)/(v1-v0)

def ring_scan(im,fixed,axis,a0,a1,label,s,pk_hint=None):
    vals=[]; 
    for a in range(a0,a1):
        vals.append(gold(im,a,fixed) if axis=='x' else gold(im,fixed,a))
    pk=max(vals); base=median(sorted(vals)[:len(vals)//3])
    thr=base+0.5*(pk-base); thr9=base+0.9*(pk-base)
    sg=[t for t in segs_on(vals,None,thr) if t[1]-t[0]>=2]
    sg9=[t for t in segs_on(vals,None,thr9) if t[1]-t[0]>=1]
    e=[]
    for a,b in sg:
        ea=sub(vals,a-1,a,thr) if a>0 else a
        eb=sub(vals,b,b-1,thr) if b<len(vals) else b
        e.append((a0+ea,a0+eb))
    e9=[(a0+t[0],a0+t[1]) for t in sg9]
    print(f"    {label}: pic(R-B)={pk:.0f} fond={base:.0f} seuil50={thr:.0f}")
    for i,(x0,x1) in enumerate(e):
        print(f"       segment {i+1}: {x0:7.2f}..{x1:7.2f} px  (largeur nominale {x1-x0:5.2f} px = {(x1-x0)/s:5.2f} CSS)")
    print(f"       coeur(>=90% du pic): {[(round(a,1),round(b,1)) for a,b in e9]}")
    return e

print("== m11 boitier ==")
r=load(REF)
print("  REFERENCE — scan VERTICAL x=588")
ev=ring_scan(r,588,'y',0,260,'ref vertical',S_REF)
print("  REFERENCE — scan HORIZONTAL y=116")
eh=ring_scan(r,116,'x',470,710,'ref horizontal',S_REF)

d=load(DIS24)
print("  JEU district 2400 — scan VERTICAL x=540")
gv=ring_scan(d,540,'y',0,270,'jeu vertical',S_CAP)
print("  JEU district 2400 — scan HORIZONTAL y=130")
gh=ring_scan(d,130,'x',420,670,'jeu horizontal',S_CAP)
