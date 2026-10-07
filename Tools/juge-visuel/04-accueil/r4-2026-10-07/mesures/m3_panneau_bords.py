# m3 — bords du panneau LA SUITE + plages contigues du filet or
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",829,1000),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",823,1060),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1230,1460)}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,(ch,yor,yint) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {im.size} ===")
    # plages contigues du filet
    runs=[];cur=None
    for x in range(1080):
        p=px[x,yor]; ok=(p[0]-p[2])>30
        if ok and cur is None: cur=x
        if not ok and cur is not None: runs.append((cur,x-1)); cur=None
    if cur is not None: runs.append((cur,1079))
    print(f"  filet or y={yor} plages (>=5px) :", [(a,b,b-a+1) for a,b in runs if b-a+1>=5])
    # profil d'intensite du filet
    print("  R-B le long du filet :", " ".join(f"{x}:{px[x,yor][0]-px[x,yor][2]}" for x in range(100,1080,50)))
    # bords du panneau : ligne y=yint, on cherche les sauts
    print(f"  ligne y={yint} RGB aux x cles :", " ".join(f"{x}:{px[x,yint]}" for x in [30,40,45,48,50,52,55,60,70,1010,1020,1025,1028,1030,1032,1035,1040,1050]))
