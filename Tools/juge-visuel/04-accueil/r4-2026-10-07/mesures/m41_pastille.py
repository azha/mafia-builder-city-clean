from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for nom,ch,ya,yb in (('REF',B+"r2-2026-10-07/reference/cadre-4-la-suite.png",1855,1925),
                     ('J1920',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",1690,1760),
                     ('J2400',B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",2170,2240)):
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[(x,y) for y in range(ya,yb) for x in range(380,540) if (px[x,y][0]-px[x,y][2])>60 and lum(px[x,y])>80]
    print(f"  {nom:6s} [{im.size}] pixels or autour du rond FAMILLE : {len(pts)}" + (f"  bbox=({min(p[0] for p in pts)},{min(p[1] for p in pts)})..({max(p[0] for p in pts)},{max(p[1] for p in pts)})" if pts else ""))
