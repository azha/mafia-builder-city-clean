# m32 — chasse des chaines IDENTIQUES, normalisee par la hauteur de capitale (invariant d'echelle).
# La maquette declare 'DejaVu Sans'/'DejaVu Serif' (ecrans-brennar-accueil.html:734-737), les memes
# familles que le client embarque : la chasse EST donc comparable, pas seulement la capitale.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def chasse(ch,x0,x1,y0,y1,cap,t,seuil=60):
    im=Image.open(ch).convert('RGB'); px=im.load()
    xs=[x for x in range(x0,x1) if any(lum(px[x,y])>seuil for y in range(y0,y1))]
    c=max(xs)-min(xs)+1
    print(f"  {t:42s} [{im.size}] x {min(xs)}..{max(xs)}  chasse={c}  capitale={cap}  chasse/capitale={c/cap:.2f}")
    return c/cap
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
print("chaines IDENTIQUES des deux cotes :")
a=chasse(R,630,1000,1193,1214,21,"REF   VOIR LA VENTE")
b=chasse(J,700,1010,1140,1158,18,"J1920 VOIR LA VENTE")
print(f"     -> interlettrage relatif jeu/ref = {b/a:.3f}")
a=chasse(R,730,1000,1453,1474,21,"REF   BLANCHIR")
b=chasse(J,780,1000,1335,1353,18,"J1920 BLANCHIR")
print(f"     -> interlettrage relatif jeu/ref = {b/a:.3f}")
a=chasse(R,420,700,871,889,17,"REF   LA SUITE")
b=chasse(J,420,700,866,882,16,"J1920 LA SUITE")
print(f"     -> interlettrage relatif jeu/ref = {b/a:.3f}")
a=chasse(R,90,640,948,977,29,"REF   Le labo attend du Pyralin")
b=chasse(J,90,640,938,966,28,"J1920 Le labo attend du Pyralin")
print(f"     -> chasse relative jeu/ref = {b/a:.3f}")
a=chasse(R,90,460,1007,1031,24,"REF   Sans lui, rien ne cuit.")
b=chasse(J,90,400,996,1015,19,"J1920 Sans lui, rien ne cuit.")
print(f"     -> chasse relative jeu/ref = {b/a:.3f}")
a=chasse(R,700,1000,1736,1759,23,"REF   TRANCHER")
b=chasse(J,760,1040,1552,1571,19,"J1920 TRANCHER")
print(f"     -> interlettrage relatif jeu/ref = {b/a:.3f}")
