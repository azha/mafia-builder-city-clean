# m6 — bandes d'encre dans la colonne de texte du panneau (x 90..620) : chaque ligne de texte.
# "encre" = pixel dont la luminance depasse de 25 la mediane locale du fond du panneau.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
CIB={'REF':(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",820,1630,90,620),
     'J1920':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",826,1450,90,620),
     'J2400':(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",1233,1857,90,620)}
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,(ch,y0,y1,x0,x1) in CIB.items():
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n=== {nom} {ch.split('/')[-1]} {im.size}  colonne texte x={x0}..{x1} ===")
    cnt=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if lum(px[x,y])>70)
        cnt.append((y,n))
    bandes=[];cur=None
    for y,n in cnt:
        if n>=3 and cur is None: cur=y
        if n<3 and cur is not None:
            if y-cur>=4: bandes.append((cur,y-1))
            cur=None
    if cur: bandes.append((cur,y1-1))
    for a,b in bandes:
        # largeur d'encre
        xs=[x for x in range(x0,x1) for yy in range(a,b+1) if lum(px[x,yy])>70]
        print(f"   bande y={a}..{b}  hauteur={b-a+1}  x_encre {min(xs)}..{max(xs)} (largeur {max(xs)-min(xs)+1})")
