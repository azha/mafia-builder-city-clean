# m14 — capitales : bandes d'encre d'une fenetre restreinte au PREMIER glyphe majuscule.
# Separe la capitale du SOULIGNE POINTILLE (bande fine detachee ~6-10 px sous la ligne de base).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def bandes(ch,x0,x1,y0,y1,t,seuil=70):
    im=Image.open(ch).convert('RGB'); px=im.load()
    rows=[(y,sum(1 for x in range(x0,x1) if lum(px[x,y])>seuil)) for y in range(y0,y1)]
    out=[];cur=None
    for y,n in rows:
        if n>0 and cur is None: cur=y
        if n==0 and cur is not None: out.append((cur,y-1)); cur=None
    if cur: out.append((cur,y1-1))
    print(f"  {t:36s} [{im.size}] bandes:", [(a,b,b-a+1) for a,b in out])
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("REFERENCE")
bandes(R,456,470,860,900,"LA SUITE : 'L'")
bandes(R,101,112,940,1000,"titre1 serif : fut du 'L'")
bandes(R,101,116,1000,1045,"sous-titre1 : 'S'")
bandes(R,681,700,965,1020,"COMMANDER : 'C'")
bandes(R,643,666,1180,1240,"VOIR LA VENTE : 'V'")
bandes(R,744,765,1440,1500,"BLANCHIR : 'B'")
bandes(R,92,112,1700,1770,"plaque 'Lt.' : fut du 'L'")
bandes(R,772,793,1725,1780,"TRANCHER : 'T'")
bandes(R,92,105,1760,1810,"LEGERE : 'L'")
print("\nJEU 1080x1920")
bandes(J,467,478,855,895,"LA SUITE : 'L'")
bandes(J,99,104,925,985,"titre1 serif : fut du 'L'")
bandes(J,96,108,988,1030,"sous-titre1 : 'S'")
bandes(J,757,775,950,1010,"COMMANDER : 'C'")
bandes(J,737,755,1125,1185,"VOIR LA VENTE : 'V'")
bandes(J,801,815,1325,1380,"BLANCHIR : 'B'")
bandes(J,79,100,1525,1570,"plaque 'Lt.' : fut du 'L'")
bandes(J,831,848,1540,1590,"TRANCHER : 'T'")
bandes(J,79,90,1565,1605,"LEGERE : 'L'")
print("\nJEU 1080x2400")
bandes(K,467,478,1262,1300,"LA SUITE : 'L'")
bandes(K,99,104,1332,1390,"titre1 serif : fut du 'L'")
bandes(K,96,108,1394,1435,"sous-titre1 : 'S'")
