# m02 — CHROME tel quel : capitale d'ARGENT, chasse, position ; + capitale JOUR
# Convention de bord DECLAREE : encre = luminance >= fond + 0.5*(pic-fond)  (bord a MI-AMPLITUDE)
from lib import *

def ink(im, x0,y0,x1,y1):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    s=sorted(ls); bg=s[len(s)//10]; pk=s[-max(1,len(s)//100)]
    thr=bg+0.5*(pk-bg)
    xs=[];ys=[];n=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(im.getpixel((x,y)))>=thr: xs.append(x);ys.append(y);n+=1
    if not xs: return None
    return dict(x0=min(xs),y0=min(ys),x1=max(xs)+1,y1=max(ys)+1,n=n,bg=bg,pk=pk,thr=thr)

def show(im,s,box,label,note=''):
    b=ink(im,*box)
    if not b: print(f"    {label}: AUCUNE encre"); return None
    w=(b['x1']-b['x0'])/s; h=(b['y1']-b['y0'])/s
    print(f"    {label:26s} CSS  x {b['x0']/s:7.2f}..{b['x1']/s:7.2f}  y {b['y0']/s:6.2f}..{b['y1']/s:6.2f}"
          f"  chasse={w:6.2f}  capitale={h:5.2f}  n={b['n']:5d} {note}")
    return dict(x0=b['x0']/s,y0=b['y0']/s,x1=b['x1']/s,y1=b['y1']/s,w=w,h=h)

print("== m02 CHROME — textes du bandeau ==")
r=load(REF)
print("  REFERENCE (px/CSS = 3.0) — fenetres serrees lues sur l'image")
R={}
R['ARGENT']=show(r,S_REF,(44,26,190,52),'ARGENT (ref)')
R['MONTANT']=show(r,S_REF,(44,58,250,116),'$ 24 850 (ref)')
R['JOURL']=show(r,S_REF,(990,26,1140,52),'SOIREE (ref, dernier mot)')

print()
for p,nm,argbox,montbox in [
    (CAP19,'cap 1080x1920',(170,24,300,50),(170,58,1080,118)),
    (CAP24,'cap 1080x2400',(170,24,300,50),(170,58,1080,118)),
    (DIS24,'district 2400',(170,24,300,50),(170,58,1080,118)),
]:
    im=load(p)
    print(f"  {nm} (px/CSS = 2.7551)")
    show(im,S_CAP,argbox,'ARGENT (jeu)')
    show(im,S_CAP,montbox,'montant (jeu)')
    print()
