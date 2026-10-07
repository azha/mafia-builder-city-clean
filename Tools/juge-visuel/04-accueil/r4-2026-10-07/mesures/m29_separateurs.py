# m29 — etendue horizontale des separateurs de rangee + marges interieures du panneau.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
CAS=[('REF  sep1',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",1075),
     ('REF  sep2',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",1334),
     ('J1920 sep1',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",1055),
     ('J1920 sep2',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",1243),
     ('J2400 sep1',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1461),
     ('J2400 sep2',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1649)]
for nom,ch,y in CAS:
    im=Image.open(ch).convert('RGB'); px=im.load()
    fond=sorted([lum(px[x,y-12]) for x in range(100,900,5)])[400//5]
    xs=[x for x in range(56,1026) if lum(px[x,y])>fond+8]
    print(f"  {nom:11s} [{im.size}] y={y} : x {min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})  couleur={px[(min(xs)+max(xs))//2,y]}")
