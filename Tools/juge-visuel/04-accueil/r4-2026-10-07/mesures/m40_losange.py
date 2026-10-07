# m40 — losange sous le medaillon (chrome commun ASSUME) : bbox de l'encre laiton sous l'anneau.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,ch,ya,yb in (('REF',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",196,245),
                     ('J1920',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",196,245),
                     ('J2400',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",196,245)):
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[(x,y) for y in range(ya,yb) for x in range(470,610) if (px[x,y][0]-px[x,y][2])>25 and lum(px[x,y])>30]
    if not pts: print(f"  {nom}: aucun"); continue
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  {nom:6s} [{im.size}] losange bbox=({min(xs)},{min(ys)})..({max(xs)},{max(ys)})  {max(xs)-min(xs)+1} x {max(ys)-min(ys)+1}  centre x={(min(xs)+max(xs))//2}")
