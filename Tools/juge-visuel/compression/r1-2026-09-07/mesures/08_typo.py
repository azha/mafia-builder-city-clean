#!/usr/bin/env python3
# 08 — typographie : hauteur de CAPITALE et couleur d'encre des textes du contenu.
#   Methode : sur une bande, on prend les colonnes d'encre, puis la hauteur du plus haut
#   rectangle d'encre sur une lettre CAPITALE choisie explicitement (pas la moyenne du mot,
#   pour ne pas melanger jambages et accents).
#   CONTROLE POSITIF : la meme sonde sur la reference doit rendre une hauteur de capitale
#   coherente avec la CSS (les titres de serie 2 font 20 CSS => 60 px a x3).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def mesure(f, x0,x1,y0,y1, fond, seuil, nom):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    px=im.load()
    ys=[y for y in range(y0,y1) if any(lum(px[x,y])-fond>seuil for x in range(x0,x1))]
    xs=[x for x in range(x0,x1) if any(lum(px[x,y])-fond>seuil for y in range(y0,y1))]
    if not ys: print(f"    {nom}: RIEN"); return None
    # couleur mediane de l'encre la plus dense
    pts=[px[x,y] for y in ys for x in xs if lum(px[x,y])-fond>seuil*2]
    R=sorted(p[0] for p in pts); G=sorted(p[1] for p in pts); B=sorted(p[2] for p in pts)
    m=len(R)//2
    print(f"    {nom}: y={ys[0]}..{ys[-1]} hauteur={ys[-1]-ys[0]+1} px | x={xs[0]}..{xs[-1]} largeur={xs[-1]-xs[0]+1} | encre median=({R[m]},{G[m]},{B[m]}) n={len(pts)}")
    return ys[-1]-ys[0]+1, (R[m],G[m],B[m]), (xs[0],xs[-1])

print("=== CAPTURE 1080x2400 (contenu a x3,6 ; chrome a x2,755) ===")
im=Image.open(os.path.join(D,'capture-1080x2400.png')); print("  OUVERT capture-1080x2400.png ->", im.size)
mesure('capture-1080x2400.png', 352,727, 260,315, 13.0, 25, 'titre "LA SEMAINE" (L..E)')
mesure('capture-1080x2400.png', 352,395, 260,315, 13.0, 25, '  -> la seule capitale L')
mesure('capture-1080x2400.png', 448,632, 340,380, 13.0, 20, 'sous-titre "Calm . None"')
mesure('capture-1080x2400.png', 448,478, 340,380, 13.0, 20, '  -> la capitale C')
mesure('capture-1080x2400.png',   0,1080,460,515, 13.0, 25, 'ligne "Au calme - aucune..."')
mesure('capture-1080x2400.png', 200,260, 460,515, 13.0, 25, '  -> la capitale A de "calme"? (bande x200-260)')
mesure('capture-1080x2400.png', 500,580, 205,240, 13.0, 20, 'losange')

print("=== CANON SERIE 2 'aucune semaine' 900x1752 (x3,0) ===")
im=Image.open(os.path.join(D,'etats/ecran-canon-vide.png')); print("  OUVERT etats/ecran-canon-vide.png ->", im.size)
mesure('etats/ecran-canon-vide.png', 160,650, 55,110, 11.0, 25, 'titre "LA COMPRESSION"')
mesure('etats/ecran-canon-vide.png', 160,190, 55,110, 11.0, 25, '  -> la capitale L')
mesure('etats/ecran-canon-vide.png', 160,740, 125,160, 11.0, 18, 'sur-ligne "JOUR 1 . TENSION CALME . AUCUNE"')
mesure('etats/ecran-canon-vide.png',  78,660, 355,420, 12.0, 25, 'titre de plaque "Rien ne presse..."')

print("=== v4-29 900x1752 (x3,0) ===")
im=Image.open(os.path.join(D,'etats/v4-29.png')); print("  OUVERT etats/v4-29.png ->", im.size)
mesure('etats/v4-29.png', 170,730, 610,665, 22.0, 30, 'ligne de lecture "Calme - vos affaires respirent"')
mesure('etats/v4-29.png',  78,820, 770,880, 20.0, 30, 'titre de plaque "Rien ne presse..."')
