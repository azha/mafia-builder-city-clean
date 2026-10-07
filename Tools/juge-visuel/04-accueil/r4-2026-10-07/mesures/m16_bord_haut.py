# m16 — bord haut du panneau : colonne a x=300 (sous le filet), x=120 (hors filet), x=950 (hors filet).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",815,845),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",812,842),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1219,1249)}
for nom,(ch,y0,y1) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {im.size} ===")
    for x in (120,300,540,900,950,1000):
        print(f"  x={x:4d} : " + " ".join(f"{y}:{px[x,y]}" for y in range(y0,y1,2)))
