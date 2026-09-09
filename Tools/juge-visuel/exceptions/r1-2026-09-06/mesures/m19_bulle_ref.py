# m19 — bulle et filet de la RÉFÉRENCE, par courses horizontales de leur remplissage.
from util import *
print("== m19 bulle / filet (référence) ==")
ref=ouvrir(REF); px=ref.load()
def courses(cible,tol,y0,y1,minlen=200):
    out=[]
    for y in range(y0,y1):
        best=0;cur=0;x0=None;xb=None
        for x in range(1080):
            c=px[x,y]
            if abs(c[0]-cible[0])<=tol and abs(c[1]-cible[1])<=tol and abs(c[2]-cible[2])<=tol:
                if cur==0:x0=x
                cur+=1
                if cur>best: best=cur;xb=x0
            else: cur=0
        if best>minlen: out.append((y,best,xb))
    return out
c=courses((24,34,51),12,1150,1650)
print(f"  bulle : {len(c)} lignes ; y {c[0][0]}..{c[-1][0]} (h={c[-1][0]-c[0][0]+1}) ; x0min={min(t[2] for t in c)} largeur max={max(t[1] for t in c)}")
# rayon d'arrondi haut-gauche : première ligne où la course commence à x0min
y0=c[0][0]; x0min=min(t[2] for t in c)
for t in c[:30:3]: print(f"     y={t[0]} x0={t[2]} len={t[1]}")
# bord de la bulle : #ffffff2a sur fond (24,34,51) -> ~ (57,63,77) mesuré
print(f"  bord : profil VERTICAL x=700 autour du haut de la bulle :")
print("   ", [(y,px[700,y]) for y in range(y0-8,y0+8)])
# filet
f=courses((10,15,23),8,1930,2075,minlen=400)
print(f"  filet : {len(f)} lignes ; y {f[0][0]}..{f[-1][0]} (h={f[-1][0]-f[0][0]+1}) ; x0min={min(t[2] for t in f)} largeur max={max(t[1] for t in f)}")
print(f"  filet bord : profil VERTICAL x=540 :")
print("   ", [(y,px[540,y]) for y in range(f[0][0]-8,f[0][0]+6)])
print(f"  filet bord : profil HORIZONTAL y={(f[0][0]+f[-1][0])//2} :")
print("   ", [(x,px[x,(f[0][0]+f[-1][0])//2]) for x in range(34,52)])
