#!/usr/bin/env python3
"""m06 — les cinq traits du portrait (angle mort A7).

Pour chaque trait : bbox, taille en %L (invariante d'échelle), ratio h/l, et
TAUX DE REMPLISSAGE de la bbox (aire d'encre / aire de bbox) — c'est lui qui
distingue un triangle (~50 %), un disque (~78 %) et un rectangle plein (~100 %).

Couleurs échantillonnées au préalable (m05/sondage), identiques des deux côtés :
  chair (185,173,146) · sombre buste/cheveux (22,25,27) réf / (22,22,28) capture
  gant  (35,42,45) réf / (34,42,46) capture · revers clair (238,236,220)

Contrôle positif : la chair est la MÊME valeur RGB des deux côtés (185,173,146) —
le même seuil doit donc trouver un objet des deux côtés.
Contrôle négatif : une couleur absente (255,0,255) doit ne rien trouver.
"""
from PIL import Image


def mesure(path, box, cible, tol, nom):
    im = Image.open(path).convert("RGB")
    px = im.load(); W, H = im.size
    x0, y0, x1, y1 = box
    pts = []
    for y in range(y0, y1):
        for x in range(x0, x1):
            c = px[x, y]
            if all(abs(c[i] - cible[i]) <= tol for i in range(3)):
                pts.append((x, y))
    if not pts:
        print(f"  !! {nom} [{path.split('/')[-1]} {W}x{H}] : rien trouvé")
        return
    mnx = min(p[0] for p in pts); mxx = max(p[0] for p in pts)
    mny = min(p[1] for p in pts); mxy = max(p[1] for p in pts)
    w = mxx - mnx + 1; h = mxy - mny + 1
    fill = 100.0 * len(pts) / (w * h)
    print(f"  {nom} [{path.split('/')[-1]} {W}x{H}] bbox=({mnx},{mny},{mxx},{mxy}) "
          f"l={100.0*w/W:5.2f} %L h={100.0*h/W:5.2f} %L ratio={h/w:5.3f} remplissage={fill:5.1f} %"
          + ("  <-- BBOX TOUCHE LE BORD DE LA FENÊTRE" if (mnx <= x0 or mxx >= x1-1 or mny <= y0 or mxy >= y1-1) else ""))


REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
CHAIR = (185, 173, 146)
SOMBRE_R = (22, 25, 27)
SOMBRE_C = (22, 22, 28)
GANT_R = (35, 42, 45)
GANT_C = (34, 42, 46)
CLAIR = (238, 236, 220)

if __name__ == "__main__":
    print("(contrôle négatif) couleur absente :")
    mesure(REF, (70, 730, 424, 1280), (255, 0, 255), 5, "REF magenta")

    print("\n--- SILHOUETTE SOMBRE (cheveux + buste) dans la carte portrait ---")
    mesure(REF, (72, 735, 421, 1277), SOMBRE_R, 6, "REF silhouette")
    mesure(C19, (76, 474, 494, 1094), SOMBRE_C, 6, "CAP silhouette")

    print("\n--- TÊTE (aplat chair, fenêtre limitée au haut de la carte) ---")
    mesure(REF, (72, 880, 421, 1050), CHAIR, 25, "REF tête")
    mesure(C19, (76, 650, 494, 830), CHAIR, 25, "CAP tête")

    print("\n--- COL / cou (aplat chair sous la tête) ---")
    mesure(REF, (72, 1030, 421, 1080), CHAIR, 25, "REF col")
    mesure(C19, (76, 810, 494, 880), CHAIR, 25, "CAP col")

    print("\n--- REVERS (aplat clair) : triangle ou rectangle ? ---")
    mesure(REF, (72, 1060, 421, 1160), CLAIR, 22, "REF revers")
    mesure(C19, (76, 840, 494, 970), CLAIR, 22, "CAP revers")

    print("\n--- GANTS (aplat gris-vert) ---")
    mesure(REF, (72, 1120, 421, 1230), GANT_R, 8, "REF gants")
    mesure(C19, (76, 900, 494, 1020), GANT_C, 8, "CAP gants")

    print("\n--- LES 4 VOYANTS des cartes de règles (rond ou ovale ?) ---")
    for i, (yr, yc) in enumerate([(860, 560), (955, 665), (1050, 770), (1145, 880)], 1):
        mesure(REF, (465, yr - 40, 520, yr + 40), (40, 51, 69), 14, f"REF voyant {i}")
        mesure(C19, (540, yc - 60, 610, yc + 120), (42, 53, 73), 14, f"CAP voyant {i}")
