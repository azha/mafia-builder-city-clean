# m01 — capitale d'ARGENT + boite d'encre, ref vs 3 planches
# Convention de bord (declaree) : ENCRE = pixel dont la luminance depasse
#   (fond_median + 0.5*(pic - fond_median))  -> bord a MI-AMPLITUDE (mi-alpha).
from lib import *

def ink_bbox(im, x0,y0,x1,y1, label='', bg_from='min'):
    ls=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            ls.append(lum(im.getpixel((x,y))))
    ls_s=sorted(ls)
    bg = ls_s[len(ls_s)//10]          # 10e centile = fond
    pk = ls_s[-max(1,len(ls_s)//200)] # ~99.5e centile = pic d'encre
    thr = bg + 0.5*(pk-bg)
    xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(im.getpixel((x,y)))>=thr:
                xs.append(x);ys.append(y);n+=1
    if not xs: 
        print(f"    {label}: 0 px d'encre (fond {bg:.1f} pic {pk:.1f} seuil {thr:.1f})")
        return None
    return (min(xs),min(ys),max(xs)+1,max(ys)+1,n,bg,pk,thr)

def rep(im,s,box,label):
    b=ink_bbox(im,*box,label=label)
    if not b: return None
    x0,y0,x1,y1,n,bg,pk,thr=b
    print(f"    {label}: encre px x {x0}..{x1-1} y {y0}..{y1-1}  n={n}  "
          f"| CSS x {x0/s:.2f}..{x1/s:.2f} y {y0/s:.2f}..{y1/s:.2f} "
          f"| L={(x1-x0)/s:.2f} H(capitale)={(y1-y0)/s:.2f}  (fond {bg:.1f} pic {pk:.1f} seuil {thr:.1f})")
    return (x0/s,y0/s,x1/s,y1/s)

print("== m01 : mot ARGENT (capitale = hauteur d'encre, lettres toutes capitales sans accent) ==")
r=load(REF)
print("  REFERENCE (x3.0)")
rep(r,S_REF,(30,20,600,60),'ARGENT ref')

for p,nm in [(CAP19,'cap 1080x1920'),(CAP24,'cap 1080x2400'),(DIS24,'district 1080x2400')]:
    im=load(p)
    print(f"  {nm} (x2.7551)")
    rep(im,S_CAP,(100,50,900,140),'ARGENT jeu')
