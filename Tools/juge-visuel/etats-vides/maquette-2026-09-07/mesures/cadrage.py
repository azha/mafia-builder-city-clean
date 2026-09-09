#!/usr/bin/env python3
"""INSTRUMENT 4 — ce que le passage du carre au portrait coute a l'objet.

Deux emplois, deux geometries, et ils ne coutent PAS la meme chose :

  (A) BANDEAU  — l'image posee pleine largeur (1080) dans le rect libre 1080x1900 : elle
      occupe 1080x1080, RIEN n'est coupe, et il reste 820 px sous elle. Ce qui se mesure
      alors n'est pas une perte mais une POSITION : ou tombe le centre de gravite de l'encre
      claire dans le carre (haut / milieu / bas), donc si l'objet supporte d'etre ancre en
      haut ou s'il a besoin d'etre centre.

  (B) PLEIN CADRE — l'image mise a l'echelle pour COUVRIR 1080x1900 : facteur 1900/1024,
      largeur mise a l'echelle 1900, on garde 1080 => on conserve 1080/1900 = 56,8 % de la
      largeur d'origine, soit 582 px centres (x de 221 a 802). 43,2 % de la largeur part.

Grandeur mesuree : la part de l'ENCRE CLAIRE (ocre + creme = ce qui dessine) situee hors de
la bande centrale, et l'etendue horizontale p01..p99 de cette encre. On mesure l'encre claire
et non "tous les pixels" parce que le fond sombre est identique partout : le rogner ne coute
rien, et un compte sur tous les pixels rendrait 43 % pour les 12, c'est-a-dire rien.
"""
import os, sys
from PIL import Image

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))
SEUIL_CLAIR = 90        # luma percue : separe {#161c2b=26, #2c3242=48} de {#b08d3e=147, #eae0c8=224}
LARGEUR_GARDEE = 1080/1900


def luma(c):
    return (2126*c[0] + 7152*c[1] + 722*c[2]) // 10000


def profil(im):
    """compte de pixels clairs par colonne, et centre de gravite vertical de l'encre claire."""
    W, H = im.size; px = im.load()
    col = [0]*W; sy = 0; n = 0
    for y in range(H):
        for x in range(W):
            if luma(px[x, y]) >= SEUIL_CLAIR:
                col[x] += 1; sy += y; n += 1
    return col, (sy/n/H if n else None), n


def bornes(col, q):
    tot = sum(col)
    c = 0
    for x, v in enumerate(col):
        c += v
        if c >= q*tot:
            return x
    return len(col)-1


def controle_positif():
    print("== CONTROLE POSITIF ==")
    W = H = 1024
    im = Image.new("RGB", (W, H), (22, 28, 43))
    # barre claire posee sur x=100..199 (hors bande centrale) et x=500..599 (dedans)
    im.paste(Image.new("RGB", (100, 200), (234, 224, 200)), (100, 400))
    im.paste(Image.new("RGB", (100, 200), (234, 224, 200)), (500, 400))
    col, cg, n = profil(im)
    x0 = int(W*(1-LARGEUR_GARDEE)/2); x1 = W-x0
    perdu = sum(col[:x0]) + sum(col[x1:])
    print(f"  synthetique {im.size} : bande gardee x={x0}..{x1-1} ({x1-x0} px) ; 2 barres de 100x200, "
          f"une hors bande une dedans")
    print(f"  -> clair total {n} px, perdu {perdu} px = {perdu/n*100:.1f}% [attendu 50,0%] ; "
          f"centre de gravite vertical {cg:.3f} [attendu 0,488]")
    ok = abs(perdu/n*100 - 50.0) < 0.01 and abs(cg - 0.4883) < 0.001
    # controle NEGATIF : une image dont TOUT le clair est dans la bande doit rendre 0 %
    im2 = Image.new("RGB", (W, H), (22, 28, 43))
    im2.paste(Image.new("RGB", (100, 200), (234, 224, 200)), (500, 400))
    c2, _, n2 = profil(im2)
    p2 = (sum(c2[:x0]) + sum(c2[x1:]))/n2*100
    print(f"  controle NEGATIF (tout le clair dans la bande) -> perdu {p2:.1f}% [attendu 0,0%]")
    print("  ->", "OK" if ok and p2 == 0.0 else "ECHEC")
    return ok and p2 == 0.0


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    print(f"\n== CADRAGE (B) PLEIN CADRE : bande gardee = {LARGEUR_GARDEE*100:.1f} % de la largeur ==")
    print("    id  fichier                  taille     clair (% du cadre)  etendue p01..p99  clair PERDU  centre grav. vert.")
    for i, f in enumerate(IMAGES, 1):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        W, H = im.size
        col, cg, n = profil(im)
        x0 = int(W*(1-LARGEUR_GARDEE)/2); x1 = W-x0
        perdu = (sum(col[:x0]) + sum(col[x1:]))/n*100
        p01, p99 = bornes(col, 0.01), bornes(col, 0.99)
        zone = "haut" if cg < 1/3 else ("milieu" if cg < 2/3 else "bas")
        print(f"    E{i:<3}{f:<24} {W}x{H}   {n/(W*H)*100:5.1f}%            x={p01:4d}..{p99:4d}       "
              f"{perdu:5.1f}%      {cg:.3f} ({zone})")
    print(f"\n    (bande gardee en plein cadre : x = {int(1024*(1-LARGEUR_GARDEE)/2)}..{1024-int(1024*(1-LARGEUR_GARDEE)/2)-1})")
    print("    (A) BANDEAU pleine largeur 1080x1080 dans un rect libre 1080x1900 : 0 px coupe, 820 px libres sous l'image.")
