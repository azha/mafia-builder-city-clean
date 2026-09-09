#!/usr/bin/env python3
# 10 (v2) — GOUTTIERE, taux de remplissage, VIDE TERMINAL, contrastes.
#   Le dock est borne par ses RONDS (bande d'encre la plus basse), pas par sa plaque bleutee.
#   CONTROLE POSITIF : le bas du bandeau doit retomber sur 52 CSS-HUD x 2,7551 = 143 px (derive du dossier).
#   CONTROLE NEGATIF : a y=1200 (plein vide) la sonde doit rendre 0 px d'encre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def analyse(f, y_haut, y_bas, fond, facteur, nom, seuil=25):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    print(f"  OUVERT {f} -> {W}x{H}   [{nom}]")
    px=im.load()
    hl=y_bas-y_haut+1
    lignes=[y for y in range(y_haut,y_bas+1) if any(abs(lum(px[x,y])-fond)>seuil for x in range(0,W,2))]
    print(f"    rect libre y {y_haut}..{y_bas} = {hl} px = {hl/facteur:.1f} CSS")
    print(f"    lignes portant de l'encre : {len(lignes)} / {hl} = {100*len(lignes)/hl:.1f} %")
    if lignes:
        d=y_bas-max(lignes)
        print(f"    derniere encre y={max(lignes)} -> VIDE TERMINAL {d} px = {d/facteur:.0f} CSS = {100*d/hl:.1f} % du rect libre")
    return len(lignes)/hl

print("=== CAPTURE (fond 13, x3,6 ; bandeau 0..140, ronds du dock a partir de 2179) ===")
analyse('capture-1080x2400.png', 141, 2178, 13.0, 3.6, 'capture — entre bandeau et dock')
im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
xs=[x for x in range(1080) if any(abs(lum(px[x,y])-13.0)>25 for y in range(2179,2310))]
print(f"    CONTROLE + : les ronds du dock existent bien -> {len(xs)} colonnes d'encre a y2179..2309")
print(f"    CONTROLE - : encre a y=1200 -> {len([x for x in range(1080) if abs(lum(px[x,1200])-13.0)>25])} px")
print("=== CANON SERIE 2 'aucune semaine' (fond 12, x3,0 ; pas de chrome partage) ===")
analyse('etats/ecran-canon-vide.png', 30, 1740, 12.0, 3.0, 'canon vide — pleine page')
print("=== v4-29 (fond 27, x3,0 ; barre evoquee 0..185) ===")
analyse('etats/v4-29.png', 186, 1740, 27.0, 3.0, 'v4-29 — sous la barre evoquee', seuil=30)
print("=== REFERENCE v4-25 nominale (fond 27, x3,6 ; barre evoquee 0..222) ===")
analyse('reference-1080x2102.png', 223, 2090, 27.0, 3.6, 'v4-25 — sous la barre evoquee', seuil=30)

print()
print("=== CONTRASTES (fond mesure de chaque image) ===")
def cr(a,b):
    def rl(c):
        c=[v/255 for v in c]; c=[(v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4) for v in c]
        return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
    L1,L2=sorted([rl(a),rl(b)],reverse=True); return (L1+0.05)/(L2+0.05)
for nom,c,f in [('capture titre "LA SEMAINE" (--or)',(217,171,77),(13,13,13)),
                ('capture sous-titre "Calm . None" (--creme-2)',(185,173,146),(13,13,13)),
                ('capture ligne de lecture (--creme-2)',(185,173,146),(13,13,13)),
                ('canon titre "LA COMPRESSION" (--or-vif)',(242,201,107),(10,15,23)),
                ('canon boite d etat vide (--creme-2)',(185,173,146),(9,13,21))]:
    print(f"  {nom:46s} = {cr(c,f):5.2f}:1   (doctrine : >=3 grands, >=4,5 petits)")
