# m22 — plaque TRANCHER, bandeau haut, filet du bandeau, dock. Bords par couleur ~(33,38,47)+-12.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def prox(p,c,t): return all(abs(p[i]-c[i])<=t for i in range(3))
def plaque(ch,ya,yb,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[(x,y) for y in range(ya,yb) for x in range(20,1070) if prox(px[x,y],(40,46,56),14)]
    if not pts: print(f"  {t}: rien"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  {t:26s} [{im.size}] bbox=({min(xs)},{min(ys)})..({max(xs)},{max(ys)})  l={max(xs)-min(xs)+1} h={max(ys)-min(ys)+1}")
    yc=(min(ys)+max(ys))//2
    print(f"      bord gauche a y={yc} : {[px[x,yc] for x in range(min(xs)-1,min(xs)+5)]}")
    print(f"      interieur = {sorted([px[x,y] for y in range(yc-6,yc+6) for x in range(560,620)],key=lum)[360]}")
def filet_bandeau(ch,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    best=max(range(100,200), key=lambda y: sum(px[x,y][0]-px[x,y][2] for x in range(60,300,2)))
    xs=[x for x in range(0,1080) if (px[x,best][0]-px[x,best][2])>18]
    ep=[y for y in range(best-8,best+8) if (px[100,y][0]-px[100,y][2])>18]
    print(f"  {t:26s} [{im.size}] filet du bandeau y={best} couleur={px[100,best]} etendue x {min(xs)}..{max(xs)} epaisseur={len(ep)}")
def dock(ch,ya,yb,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    # cercles du dock : bord legerement plus clair ; on prend la ligne mediane et on compte les plages
    yc=(ya+yb)//2
    v=[1 if lum(px[x,yc])>18 else 0 for x in range(0,1080)]
    runs=[];cur=None
    for x in range(1080):
        if v[x] and cur is None: cur=x
        if not v[x] and cur is not None:
            if x-cur>40: runs.append((cur,x-1,x-cur))
            cur=None
    print(f"  {t:26s} [{im.size}] y={yc} plages de rond : {runs}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("=== PLAQUE TRANCHER ===")
plaque(R,1640,1830,"REF")
plaque(J,1460,1650,"J1920")
plaque(K,1870,2060,"J2400")
print("=== FILET DU BANDEAU ===")
filet_bandeau(R,"REF"); filet_bandeau(J,"J1920"); filet_bandeau(K,"J2400")
print("=== DOCK (ronds) ===")
dock(R,1855,1925,"REF"); dock(J,1690,1760,"J1920"); dock(K,2170,2240,"J2400")
