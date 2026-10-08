#!/usr/bin/env python3
"""10b — Le LISERÉ D'OR en haut du tapis de feutre de ⑤.

Deux versions de cet instrument ont menti avant celle-ci, gardées ici comme avertissement :
  - v1 cherchait l'or à une ordonnée FIXE : elle « trouvait » de l'or dont l'épaisseur
    médiane faisait 106 px — c'étaient les fenêtres éclairées du décor au-dessus du feutre ;
  - v2 localisait le bord du feutre sur la colonne x=540, COUVERTE PAR LA CARTE à 1920 : elle
    plaçait le bord à 70,6 % de la hauteur contre 43,4 % à 2400, ce qui ne pouvait pas être,
    et concluait « liseré présent » à 1920.
v3 : on localise le bord sur deux colonnes que la carte ne couvre JAMAIS (x=40 et x=1040),
on exige qu'elles s'accordent, et on ne cherche l'or que dans ±25 px autour, sur des colonnes
de bord. Une détection de plus de 25 px d'épaisseur est du décor, pas un liseré.

Contrôle négatif : la maquette DOIT rendre le liseré ; si elle ne le rend pas non plus,
l'instrument ne sait pas le voir et on ne conclut rien sur le jeu."""
from PIL import Image
import statistics

R = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference/"
C = "/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final/"

def bord(px, H, x, y0=500):
    for y in range(y0, H):
        r, g, b = px[x, y]
        if g > r+8 and g > b+8 and g > 35: return y
    return None

def lisere(path, label):
    im = Image.open(path).convert("RGB"); px = im.load(); W, H = im.size
    yg, yd = bord(px, H, 40), bord(px, H, 1040)
    if yg is None or yd is None or abs(yg-yd) > 6:
        print(f"  {label:16s} bords discordants G={yg} D={yd} -> ne rien conclure"); return
    yt = min(yg, yd)
    n = 0; ep = []
    for x in list(range(30, 110, 6)) + list(range(980, 1060, 6)):
        for y in range(max(0, yt-25), yt+25):
            c = px[x, y]
            if c[0] > 120 and c[0]-c[2] > 55 and c[2] <= c[1] <= c[0]:
                e = 0
                while y+e < H and px[x, y+e][0] > 120 and px[x, y+e][0]-px[x, y+e][2] > 55: e += 1
                n += 1; ep.append(e); break
    m = int(statistics.median(ep)) if ep else 0
    verdict = "LISERÉ" if (n > 20 and m <= 25) else ("décor, pas un liseré" if m > 25 else "ABSENT")
    dessus = [px[40, y] for y in range(yt-8, yt-2, 2)]
    print(f"  {label:16s} {W}x{H}  bord du feutre y={yt} ({100*yt/H:4.1f} % de H)  "
          f"or sur {n:2d}/28 colonnes de bord  épaisseur médiane={m:3d} px  -> {verdict}")
    print(f"                   ce qu'il y a juste au-dessus du bord : {dessus}")

lisere(R+"E11-cadre-04-la-carte-distribuee.png", "maquette c04")
lisere(C+"E11_DecisionDetail_1080x2400.png", "jeu 2400")
lisere(C+"E11_DecisionDetail_1080x1920.png", "jeu 1920")
