# m1 — reperes : bandeau haut, panneau LA SUITE, plaque TRANCHER, dock.
# Methode : profils de lignes/colonnes sur la luminance, sans numpy.
from PIL import Image
import sys

def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def charger(ch):
    im = Image.open(ch).convert('RGB'); print(f"  OUVERT {ch} {im.size}")
    return im

def profil_lignes(im, x0, x1):
    px = im.load(); out=[]
    for y in range(im.height):
        s=0
        for x in range(x0,x1,4): s+=lum(px[x,y])
        out.append(s/len(range(x0,x1,4)))
    return out

def profil_colonnes(im, y0, y1):
    px = im.load(); out=[]
    for x in range(im.width):
        s=0
        for y in range(y0,y1,4): s+=lum(px[x,y])
        out.append(s/len(range(y0,y1,4)))
    return out

def mediane(im,x0,y0,x1,y1):
    px=im.load(); c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in c)

def bord_panneau(im, nom, yhaut_min, yhaut_max):
    """Le panneau est un aplat sombre uniforme : on cherche son bord GAUCHE et DROIT
    sur une ligne traversant son interieur, puis son bord HAUT par le saut de luminance."""
    px=im.load()
    # bord haut : plus fort gradient negatif de luminance sur la colonne centrale elargie
    pl = profil_lignes(im, 100, 980)
    best=None
    for y in range(yhaut_min, yhaut_max):
        d = pl[y+1]-pl[y-1]
        if best is None or d < best[1]: best=(y,d)
    return best, pl

if __name__ == "__main__":
    B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
    cibles = {
      'REF   cadre-4': B+"r2-2026-10-07/reference/cadre-4-la-suite.png",
      'JEU   1080x1920': B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png",
      'JEU   1080x2400': B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png",
    }
    for nom,ch in cibles.items():
        print(f"\n=== {nom} ===")
        im = charger(ch)
        pl = profil_lignes(im, 60, 1020)
        # imprime le profil toutes les 10 lignes pour reperer les frontieres
        print("  profil de luminance (moyenne de ligne, x=60..1020, pas 10) :")
        s=""
        for y in range(0, im.height, 10):
            s += f"{y}:{pl[y]:.1f}  "
            if (y//10+1)%8==0: print("   ",s); s=""
        if s: print("   ",s)
