# m27 — aile gauche (montant) et aile droite (jour/heure) : boites d'encre, debordement
from lib import *
def ink(im,x0,y0,x1,y1,s,label):
    ls=[lum(im.getpixel((x,y))) for y in range(y0,y1) for x in range(x0,x1)]
    srt=sorted(ls); bg=srt[len(srt)//6]; pk=srt[-max(1,len(srt)//80)]
    thr=bg+0.5*(pk-bg)
    xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if lum(im.getpixel((x,y)))>=thr: xs.append(x);ys.append(y)
    if not xs: print(f"    {label}: RIEN"); return None
    X0,X1,Y0,Y1=min(xs),max(xs)+1,min(ys),max(ys)+1
    print(f"    {label:30s} x {X0/s:7.2f}..{X1/s:7.2f}  y {Y0/s:6.2f}..{Y1/s:6.2f}  "
          f"L={(X1-X0)/s:6.2f} H={(Y1-Y0)/s:5.2f}  (dernier px image = {im.size[0]-1}, soit {(im.size[0]-1)/s:.2f} CSS)")
    return X0/s,X1/s,Y0/s,Y1/s
print("== m27 ailes ==")
r=load(REF)
print("  REFERENCE")
ink(r,44,58,240,110,S_REF,'montant $ 24 850 (ref)')
ink(r,990,30,1140,55,S_REF,'lib JOUR 12 SOIREE (ref)')
ink(r,990,60,1150,110,S_REF,'val 21:40 (ref)')
print()
for p,nm in [(CAP19,'JEU 1920'),(CAP24,'JEU 2400')]:
    im=load(p); print(f"  {nm}")
    ink(im,170,58,470,116,S_CAP,'montant (jeu)')
    ink(im,900,20,1080,50,S_CAP,'lib JOUR 50 (jeu)')
    ink(im,900,55,1080,115,S_CAP,'val Aube (jeu)')
    print()
