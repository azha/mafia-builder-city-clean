# m27 — chrome (bandeau, medaillon, losange, dock) + controle "rien n'est coupe au cadre".
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def medaillon(ch,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    # anneau or du medaillon : pixels R-B>60 dans la zone x 400..700 y 0..230
    pts=[(x,y) for y in range(0,240) for x in range(380,700) if (px[x,y][0]-px[x,y][2])>55 and lum(px[x,y])>60]
    if not pts: print(f"  {t}: medaillon introuvable"); return
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    print(f"  {t:7s} [{im.size}] anneau or bbox=({min(xs)},{min(ys)})..({max(xs)},{max(ys)}) D={max(xs)-min(xs)+1}x{max(ys)-min(ys)+1} centre=({(min(xs)+max(xs))//2},{(min(ys)+max(ys))//2})")
def cadrage(ch,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    bords={}
    for nom,pts in (('haut',[(x,0) for x in range(0,1080,2)]),('bas',[(x,im.height-1) for x in range(0,1080,2)]),
                    ('gauche',[(0,y) for y in range(0,im.height,2)]),('droite',[(im.width-1,y) for y in range(0,im.height,2)])):
        v=[lum(px[x,y]) for x,y in pts]
        bords[nom]=(max(v), 100*sum(1 for q in v if q>70)/len(v))
    print(f"  {t:7s} [{im.size}] luminance MAX et % d'encre (lum>70) sur chaque bord : " +
          "  ".join(f"{k}: max={v[0]:.0f} encre={v[1]:.1f}%" for k,v in bords.items()))
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("=== MEDAILLON (chrome commun, ASSUME) ===")
medaillon(R,"REF"); medaillon(J,"J1920"); medaillon(K,"J2400")
print("=== CADRAGE : rien ne doit toucher les bords ===")
cadrage(R,"REF"); cadrage(J,"J1920"); cadrage(K,"J2400")
print("=== ARGENT / JOUR : position de l'encre du bandeau ===")
for nom,ch in (("REF",R),("J1920",J),("J2400",K)):
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[(x,y) for y in range(10,130) for x in range(0,420) if lum(px[x,y])>90]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f"  {nom:7s} bloc ARGENT : x {min(xs)}..{max(xs)}  y {min(ys)}..{max(ys)}")
    pts=[(x,y) for y in range(10,130) for x in range(700,1080) if lum(px[x,y])>90]
    if pts:
        xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
        print(f"  {nom:7s} bloc JOUR   : x {min(xs)}..{max(xs)}  y {min(ys)}..{max(ys)}")
