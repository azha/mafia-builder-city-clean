# m37 — RAYONS, un seul critere pour tous : retrait du bord gauche en fonction de dy depuis le
# bord haut ; le rayon est le dy ou le retrait atteint 0..1 px. Mesure identique des deux cotes.
# Controle positif : les deux boutons FANTOMES de la reference doivent rendre le MEME rayon
# (meme regle CSS) — s'ils divergent, mon critere est bruite.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rayon(ch,x0,y0,x1,test,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    prof=[]
    for dy in range(0,40):
        xs=[x for x in range(x0-6,x1) if test(px[x,y0+dy])]
        prof.append((dy,(min(xs)-x0) if xs else None))
    r=next((dy for dy,v in prof if v is not None and v<=1), None)
    print(f"  {t:34s} [{im.size}] retrait dy0..12 = {[v for _,v in prof[:13]]}  -> RAYON ~ {r} px")
    return r
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
oor=lambda p:(p[0]-p[2])>70 and p[0]>130
fan=lambda p: all(abs(p[i]-(58,63,72)[i])<=20 for i in range(3))
print("CSS de la maquette : .acc4 .suite4 .g4{border-radius:8px} => 8 x 3,6 = 28,8 px pour les TROIS boutons")
rayon(R,651,945,1000,oor,"REF   COMMANDER (or)")
rayon(J,718,931,1000,oor,"J1920 COMMANDER (or)")
rayon(K,718,1338,1000,oor,"J2400 COMMANDER (or)")
rayon(R,605,1159,1000,fan,"REF   VOIR LA VENTE (controle +)")
rayon(R,705,1418,1000,fan,"REF   BLANCHIR      (controle +)")
rayon(J,718,1090,1000,fan,"J1920 VOIR LA VENTE")
rayon(J,764,1278,1000,fan,"J1920 BLANCHIR")
rayon(K,718,1496,1000,fan,"J2400 VOIR LA VENTE")
rayon(K,764,1685,1000,fan,"J2400 BLANCHIR")
print("\nRAYON DU PANNEAU — mesure au coin BAS-GAUCHE (decor sombre), bord (33,38,47)+-12")
bor=lambda p: all(abs(p[i]-(33,38,47)[i])<=12 for i in range(3))
def rayon_bas(ch,x0,yb,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    prof=[]
    for dy in range(0,44):
        xs=[x for x in range(x0-6,x0+70) if bor(px[x,yb-dy])]
        prof.append((dy,(min(xs)-x0) if xs else None))
    r=next((dy for dy,v in prof if v is not None and v<=1), None)
    print(f"  {t:34s} [{im.size}] retrait (depuis le bas) dy0..14 = {[v for _,v in prof[:15]]} -> RAYON ~ {r} px")
rayon_bas(R,48,1620,"REF   panneau, coin bas-gauche")
rayon_bas(J,48,1449,"J1920 panneau, coin bas-gauche")
rayon_bas(K,48,1856,"J2400 panneau, coin bas-gauche")

print("\nRAYON DU PANNEAU, 2e methode : abscisse ou commence la DERNIERE ligne du bord bas")
def rayon_bas2(ch,y,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    xs=[x for x in range(30,300) if bor(px[x,y])]
    print(f"  {t:34s} [{im.size}] y={y} : bord present de x={min(xs) if xs else None}  -> rayon ~ {min(xs)-48 if xs else None} px")
rayon_bas2(R,1620,"REF   ligne du bas du panneau")
rayon_bas2(J,1449,"J1920 ligne du bas du panneau")
rayon_bas2(K,1856,"J2400 ligne du bas du panneau")
rayon_bas2(R,1824,"REF   ligne du bas de la plaque")
rayon_bas2(J,1634,"J1920 ligne du bas de la plaque")
