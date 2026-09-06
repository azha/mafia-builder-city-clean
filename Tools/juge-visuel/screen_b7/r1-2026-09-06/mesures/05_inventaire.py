"""05 - Inventaire chiffre des deux images.
Outils : bbox d'encre dans une region (seuil sur la distance au fond local),
couleur mediane d'une fenetre, hauteur de capitale (bbox d'encre d'une bande de texte).

CONTROLE POSITIF (imprime en tete) : les 4 barres de la colonne 2 de la reference doivent
rendre EXACTEMENT #ff9e3d (255,158,61) et la barre vide #2a3648 (42,54,72) -- valeurs ecrites
en toutes lettres dans le markup du cadre #131. Si l'instrument ne les rend pas, il ne mesure pas.
CONTROLE NEGATIF : une fenetre prise dans le fond pur doit rendre une bbox VIDE.
"""
from PIL import Image
from statistics import median

def load(p):
    im = Image.open(p).convert('RGB'); print(f"  ouvre {p}: {im.size}"); return im

def med(im, x0,y0,x1,y1):
    p=im.load(); R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            r,g,b=p[x,y][:3]; R.append(r);G.append(g);B.append(b)
    return (int(median(R)),int(median(G)),int(median(B)))

def bbox(im, x0,y0,x1,y1, fond, tol=22):
    p=im.load(); xs=[];ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=p[x,y][:3]
            if max(abs(c[i]-fond[i]) for i in range(3))>tol:
                xs.append(x); ys.append(y)
    if not xs: return None
    return (min(xs),min(ys),max(xs),max(ys))

print("=== CONTROLES ===")
ref = load('../reference-1080x2102.png')
cap = load('../capture-1080x2400.png')
print("  [+] ref barre col2 rang1 (y1010-1022, x450-650) =", med(ref,450,1010,650,1022), " attendu (255,158,61) #ff9e3d")
print("  [+] ref barre col1 rang1 vide (y980-994, x120-330) =", med(ref,120,980,330,994), " attendu (42,54,72) #2a3648")
print("  [+] ref barre col3 rang4 (y1068-1080, x740-980) =", med(ref,740,1068,980,1080), " attendu (125,179,106) #7db36a")
print("  [-] cap fond pur (y1300-1350,x400-700) bbox =", bbox(cap,400,1300,700,1350,(13,13,13)), " attendu None")
print()

# ---------------------------------------------------------------- REFERENCE
print("=== REFERENCE : parties ===")
p=ref.load()
# cerne (filet or du corps d'ecran) : colonnes ou l'or #b08d3e apparait
gold=[(x,y) for y in range(400,2102,2) for x in (22,23,1056,1057)
      if abs(p[x,y][0]-176)<40 and abs(p[x,y][1]-141)<40 and abs(p[x,y][2]-62)<40]
ys=[y for _,y in gold]
print(f"  cerne (filet or 1px) : x=22..23 et 1056..1057 ; y {min(ys)}..{max(ys)}  hauteur={max(ys)-min(ys)+1}")
# enseigne
print("  enseigne panneau  bbox=", bbox(ref,30,440,1050,690,(11,16,22),tol=12))
print("   titre 'Le dossier'  encre=", bbox(ref,60,470,1020,620,(20,26,34),tol=45), " couleur=", med(ref,470,540,520,556))
print("   sous-titre         encre=", bbox(ref,60,600,1020,660,(15,21,31),tol=35))
print("   filet or bas       y=", [y for y in range(650,690) if med(ref,400,y,700,y+1)[0]>120])
# compteurs
for i,(a,b) in enumerate([(84,372),(396,684),(708,996)]):
    print(f"   compteur {i+1} bbox=", bbox(ref,a,695,b,825,(11,16,22),tol=10))
# elast + pistes
print("  elast(panneau grand) bbox=", bbox(ref,30,835,1050,1560,(9,10,11),tol=10))
for i,(a,b) in enumerate([(84,372),(396,684),(708,996)]):
    print(f"   piste {i+1} bbox=", bbox(ref,a-8,860,b+8,1230,(13,15,16),tol=10))
    for j,(y0,y1) in enumerate([(977,998),(1006,1026),(1035,1055),(1063,1084)]):
        print(f"     cran {j+1} y{y0}..{y1} col=", med(ref,a+20,y0+3,b-20,y1-3))
# pann
print("  pann bbox=", bbox(ref,30,1565,1050,1875,(11,16,22),tol=10))
print("   eyebrow encre=", bbox(ref,80,1600,1000,1640,(17,24,35),tol=30), med(ref,95,1612,300,1626))
print("   titre serif encre=", bbox(ref,80,1645,1000,1750,(17,24,35),tol=40), med(ref,100,1665,110,1690))
print("   corps encre=", bbox(ref,80,1760,1000,1840,(17,24,35),tol=30))
# cta + note
print("  cta bbox=", bbox(ref,30,1880,1050,2010,(11,16,22),tol=10))
print("   cta texte encre=", bbox(ref,100,1920,980,1990,(22,25,27),tol=40), med(ref,250,1955,255,1970))
print("  note encre=", bbox(ref,80,2020,1000,2090,(11,16,22),tol=25))
print()
