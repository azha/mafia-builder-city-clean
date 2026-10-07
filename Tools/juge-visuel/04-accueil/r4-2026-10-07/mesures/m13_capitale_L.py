# m13 — hauteur de capitale du 'L' de "Le labo", colonne par colonne (verification du m12).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def profil(ch, x0,x1, y0,y1, seuil=70, t=""):
    im=Image.open(ch).convert('RGB'); px=im.load()
    print(f"\n{t}  [{ch.split('/')[-1]} {im.size}]  fenetre x{x0}..{x1} y{y0}..{y1}")
    for x in range(x0,x1):
        ys=[y for y in range(y0,y1) if lum(px[x,y])>seuil]
        if ys: print(f"   x={x:4d} : encre y {ys[0]}..{ys[-1]}  n={len(ys)}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
profil(R, 96,160, 935,1000, t="REF  'Le' du titre 1")
profil(J, 94,150, 925,985, t="J1920 'Le' du titre 1")
profil(R, 96,145,1000,1050, t="REF  'Sa' du sous-titre 1")
profil(J, 94,140, 988,1025, t="J1920 'Sa' du sous-titre 1")
