# m04 : alignement global de la PEINTURE par recherche exhaustive (echelle uniforme s,
# decalages dx,dy) minimisant l'ecart absolu median sur une grille de points de la carte.
# La ville est la MEME texture des deux cotes : le minimum doit etre net.
# Controle : on imprime la carte des scores autour du minimum (elle doit etre convexe),
# et un controle negatif (s=1.20) qui doit etre nettement pire.
from PIL import Image, ImageFilter

REF='reference-1080x2102.png'; CAP='capture-1080x2400.png'
ref=Image.open(REF).convert('L'); cap=Image.open(CAP).convert('L')
print(f"ouvert {REF} -> {ref.size} ; {CAP} -> {cap.size}")
# flouter pour absorber le reechantillonnage et les marqueurs fins
refb=ref.filter(ImageFilter.GaussianBlur(6)); capb=cap.filter(ImageFilter.GaussianBlur(6))
rp=refb.load(); cp=capb.load()

# points d'echantillonnage dans la carte de la REFERENCE (sous le bandeau, au dessus de l'aide)
pts=[(x,y) for y in range(260,1930,20) for x in range(30,1050,20)]
print(f"points d'echantillonnage : {len(pts)}")

def score(s,dx,dy):
    tot=0; n=0
    for (x,y) in pts:
        X=x*s+dx; Y=y*s+dy
        if 0<=X<1079 and 0<=Y<2399:
            tot += abs(rp[x,y]-cp[int(X),int(Y)]); n+=1
    return (tot/n if n else 1e9), n

best=None
for si in range(-10,41):
    s=1.0+si*0.002
    for dx in range(-30,31,3):
        for dy in range(0,80,3):
            v,n=score(s,dx,dy)
            if best is None or v<best[0]: best=(v,s,dx,dy,n)
print(f"MEILLEUR grossier : score={best[0]:.3f} s={best[1]:.4f} dx={best[2]} dy={best[3]} (n={best[4]})")
v0,s0,dx0,dy0,_=best
best2=None
for si in range(-8,9):
    s=s0+si*0.0005
    for dx in range(dx0-4,dx0+5):
        for dy in range(dy0-4,dy0+5):
            v,n=score(s,dx,dy)
            if best2 is None or v<best2[0]: best2=(v,s,dx,dy)
print(f"MEILLEUR fin     : score={best2[0]:.3f} s={best2[1]:.4f} dx={best2[2]} dy={best2[3]}")
v,s,dx,dy=best2
print("\ncarte des scores autour du minimum (dy en colonnes) :")
print("   s\\dy " + " ".join(f"{d:7d}" for d in range(dy-6,dy+7,3)))
for si in range(-4,5,2):
    ss=s+si*0.002
    row=" ".join(f"{score(ss,dx,d)[0]:7.3f}" for d in range(dy-6,dy+7,3))
    print(f"{ss:7.4f} {row}")
print(f"\nCONTROLE NEGATIF s=1.20 dx={dx} dy={dy} -> {score(1.20,dx,dy)[0]:.3f} (doit etre >> {v:.3f})")
print(f"CONTROLE NEGATIF s={s:.4f} dy={dy+120}    -> {score(s,dx,dy+120)[0]:.3f}")
