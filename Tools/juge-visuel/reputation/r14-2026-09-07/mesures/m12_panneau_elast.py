"""m12 — le panneau elastique et la carte portrait : rectangles exacts.
Le lisere du panneau est faible : je le cherche comme MAXIMUM LOCAL du profil, pas par
un seuil absolu. Convention de bord : mi-hauteur du pic local.
Controle positif : la carte portrait doit rendre 424 px (REF) / 425 (JEU) hors-tout en x,
valeur deja obtenue en m11 par un autre chemin.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def pics(prof, off, nom, mini=1.5):
    out = []
    for i in range(2, len(prof)-2):
        if prof[i] >= prof[i-1] and prof[i] >= prof[i+1] and \
           prof[i] - min(prof[max(0,i-6):i+7]) >= mini:
            out.append((i+off, prof[i]))
    # fusionne les voisins
    f = []
    for p in out:
        if f and p[0]-f[-1][-1][0] <= 3: f[-1].append(p)
        else: f.append([p])
    print(f"   {nom} : " + " | ".join(
        f"{g[0][0]}..{g[-1][0]} (pic {max(v for _,v in g):.1f})" for g in f))
    return f

for nom, fp, yA, yB, xA, xB in [
        ('REF', '../reference-1080x2102.png', 840, 1625, 25, 1055),
        ('JEU2400', '../capture-1080x2400.png', 865, 1565, 22, 1058)]:
    im = ouvrir(fp); px = im.load()
    print(f"\n== {nom} ==")
    # profil de colonnes sur une bande de rangees VIDES du panneau (sous les tuiles)
    prof = [mediane([lum(px[x, y]) for y in range(yB-60, yB-20)]) for x in range(xA, xB+1)]
    pics(prof, xA, 'bords verticaux (bande basse du panneau)')
    # profil de rangees sur une colonne a droite des tuiles
    prof2 = [mediane([lum(px[x, y]) for x in range(1010, 1040)]) for y in range(yA, yB+1)]
    pics(prof2, yA, 'bords horizontaux (colonne x1010..1040, hors tuiles)')
    # carte portrait : colonne 300 (dans la carte)
    prof3 = [mediane([lum(px[x, y]) for x in range(290, 310)]) for y in range(yA, yB+1)]
    pics(prof3, yA, 'carte portrait (col x290..310)', mini=4)
