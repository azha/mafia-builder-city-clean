#!/usr/bin/env python3
"""07 — Le MANOMÈTRE du bandeau : le seul objet de chrome présent sur les 12 écrans.
Grandeurs, toutes rapportées au DIAMÈTRE DE L'ANNEAU (donc invariantes d'échelle) :
  - diamètre extérieur de l'anneau d'or (px d'image, 1080 de large des deux côtés)
  - ÉPAISSEUR de l'anneau d'or, en % du diamètre
  - RAYON de l'arc coloré (teal/rouge), en % du diamètre  -> la taille du cadran dans l'anneau
  - le FILET d'or du bandeau traverse-t-il le disque ?

L'or est détecté par teinte : r>130, r>b+55, g entre b et r.
Contrôle positif : le diamètre doit être ~le même des deux côtés — c'est la garde de capture
du harnais (« échelle du chrome lue sur le PNG », un run à x1,21 avait déjà coûté 2 BLOQUANT).
Contrôle négatif : l'épaisseur et le rayon d'arc, eux, n'ont aucune raison d'être égaux si
le dessin diffère. Si TOUT sort égal, l'instrument ne discrimine pas."""
from PIL import Image
import os

REF = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"

def est_or(c):
    r, g, b = c[:3]
    return r > 130 and r-b > 55 and b <= g <= r

def est_arc(c):
    r, g, b = c[:3]
    teal = b > 70 and g > r+12 and b > r+8
    rouge = r > 95 and r > g+35 and r > b+30 and g < 110
    return teal or rouge

def mesure(path, label):
    im = Image.open(path).convert("RGB"); px = im.load(); W, H = im.size
    # bande du bandeau : y 0..260. on cherche la colonne du centre (x ~ 540)
    cx = W//2
    # diametre vertical de l'anneau sur la colonne du centre, en sautant le texte
    ors = [y for y in range(0, 230) if est_or(px[cx, y])]
    # l'anneau : premier et dernier or sur une colonne decalee du centre (evite le texte/aiguille)
    col = cx - 60
    ors2 = [y for y in range(0, 230) if est_or(px[col, y])]
    if not ors2:
        print(f"  {label:34s} anneau introuvable"); return
    haut, bas = min(ors2), max(ors2)
    # epaisseur : plus longue suite d'or contigue depuis le haut
    ep = 1
    while haut+ep < H and est_or(px[col, haut+ep]): ep += 1
    # diametre horizontal sur la ligne du centre du disque
    yc = (haut+bas)//2
    orsx = [x for x in range(cx-200, cx+200) if est_or(px[x, yc])]
    diam = (max(orsx)-min(orsx)+1) if orsx else (bas-haut+1)
    # rayon de l'arc colore : distance max au centre
    cxx, cyy = (min(orsx)+max(orsx))//2 if orsx else cx, yc
    ray = 0
    for y in range(max(0, cyy-130), cyy+130):
        for x in range(cxx-130, cxx+130):
            if 0 <= x < W and 0 <= y < H and est_arc(px[x, y]):
                d = ((x-cxx)**2 + (y-cyy)**2)**0.5
                if d > ray: ray = d
    # le filet d'or traverse-t-il le disque ?
    # on prend la ligne du filet (l'or le plus a gauche, loin du disque) puis on regarde au centre
    yf = None
    for y in range(80, 200):
        if est_or(px[120, y]): yf = y; break
    trav = "pas de filet détecté"
    if yf is not None:
        dedans = [x for x in range(cxx-55, cxx+55) if est_or(px[x, yf])]
        trav = f"filet à y={yf} ; or sur {len(dedans)}/110 px DANS le disque -> " + \
               ("TRAVERSE" if len(dedans) > 60 else "interrompu par le disque")
    print(f"  {label:34s} {W}x{H}  diam={diam:3d} px  épaisseur={ep:2d} px = {100*ep/diam:4.1f} % du diam"
          f"  rayon d'arc={ray:5.1f} = {100*ray/(diam/2):4.1f} % du rayon  | {trav}")
    return diam, ep, ray

print("Le manomètre, maquette puis jeu, sur le même écran (㉚ E03) :")
a = mesure(os.path.join(REF, "E03-cadre-48.png"), "réf E03-cadre-48")
b = mesure(os.path.join(CAP, "E03_Chanedappro_1080x2400.png"), "jeu E03 2400")
print("\nLe même, sur trois autres écrans, pour vérifier que le chrome est bien IDENTIQUE partout :")
for f in ["E05-cadre-67.png", "E10-cadre-140-pas-encore-de-filiere.png", "E11-cadre-04-la-carte-distribuee.png"]:
    mesure(os.path.join(REF, f), "réf " + f[:22])
for f in ["E05_Loi_1080x2400.png", "E10_Filire_1080x2400.png", "E11_DecisionDetail_1080x2400.png"]:
    mesure(os.path.join(CAP, f), "jeu " + f[:22])
if a and b:
    print(f"\ncontrôle positif  diamètre : réf {a[0]} px / jeu {b[0]} px -> rapport {b[0]/a[0]:.3f}")
    print(f"épaisseur de l'anneau : réf {100*a[1]/a[0]:.1f} % / jeu {100*b[1]/b[0]:.1f} % du diamètre")
    print(f"rayon de l'arc        : réf {100*a[2]/(a[0]/2):.1f} % / jeu {100*b[2]/(b[0]/2):.1f} % du rayon")
