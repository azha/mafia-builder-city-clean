# m12 — hauteur de CAPITALE du premier glyphe de chaque texte (seul invariant comparable
# entre deux familles de polices). On isole la 1re colonne d'encre et on lit sa hauteur.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def capitale(ch, x0,x1, y0,y1, seuil=70, libelle=""):
    im=Image.open(ch).convert('RGB'); px=im.load()
    # 1re colonne d'encre
    xs=[x for x in range(x0,x1) if any(lum(px[x,y])>seuil for y in range(y0,y1))]
    if not xs: return None
    xg=xs[0]
    # largeur du glyphe : colonnes contigues depuis xg
    xd=xg
    while xd+1<x1 and any(lum(px[xd+1,y])>seuil for y in range(y0,y1)): xd+=1
    ys=[y for y in range(y0,y1) if any(lum(px[x,y])>seuil for x in range(xg,xd+1))]
    print(f"   {libelle:34s} glyphe x {xg}..{xd} (l={xd-xg+1})  encre y {ys[0]}..{ys[-1]}  HAUTEUR={ys[-1]-ys[0]+1}")
    return ys[-1]-ys[0]+1
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("REF", Image.open(R).size, "| J1920", Image.open(J).size, "| J2400", Image.open(K).size)
print("\n=== REF cadre-4 ===")
capitale(R, 420,700, 865,895, libelle="LA SUITE  (L)")
capitale(R,  92,300, 940,1000, libelle="titre 1 serif  (L de Le labo)")
capitale(R,  92,300,1000,1040, libelle="sous-titre 1 sans (S de Sans)")
capitale(R, 655,980, 975,1010, libelle="COMMANDER (C)")
capitale(R, 630,980,1185,1230, libelle="VOIR LA VENTE (V)")
capitale(R, 730,980,1445,1490, libelle="BLANCHIR (B)")
capitale(R,  92,400,1700,1760, libelle="plaque: Lt. Ilm... (L)")
capitale(R, 700,990,1700,1760, libelle="TRANCHER (T)")
capitale(R,  92,400,1760,1810, libelle="LEGERE (L)")
print("\n=== JEU 1080x1920 ===")
capitale(J, 420,700, 860,890, libelle="LA SUITE  (L)")
capitale(J,  92,300, 930,975, libelle="titre 1 serif  (L de Le labo)")
capitale(J,  92,300, 990,1020, libelle="sous-titre 1 sans (S de Sans)")
capitale(J, 720,990, 960,1000, libelle="COMMANDER (C)")
capitale(J, 720,990,1130,1175, libelle="VOIR LA VENTE (V)")
capitale(J, 770,990,1320,1370, libelle="BLANCHIR (B)")
capitale(J,  60,400,1520,1570, libelle="plaque: Lt. Marr... (L)")
capitale(J, 700,1030,1520,1580, libelle="TRANCHER (T)")
capitale(J,  60,400,1570,1610, libelle="LEGERE (L)")
print("\n=== JEU 1080x2400 ===")
capitale(K, 420,700,1266,1296, libelle="LA SUITE  (L)")
capitale(K,  92,300,1337,1385, libelle="titre 1 serif  (L de Le labo)")
capitale(K,  92,300,1397,1427, libelle="sous-titre 1 sans (S de Sans)")
capitale(K, 720,990,1367,1407, libelle="COMMANDER (C)")
