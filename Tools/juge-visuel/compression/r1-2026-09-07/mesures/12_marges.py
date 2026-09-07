#!/usr/bin/env python3
# 12 (v2) — MARGES horizontales du contenu.
#   Les maquettes portent un CADRE de telephone sur leurs 15 premieres/dernieres colonnes :
#   on l'exclut explicitement (bord=15) apres l'avoir mesure, sinon toute marge rend 0.
#   CONTROLE POSITIF : le titre de la capture doit rendre des marges symetriques et confortables.
#   CONTROLE NEGATIF : le filet du bandeau de la capture (pleine largeur) doit rendre 0 / 0.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def marges(f,y0,y1,fond,fac,nom,seuil=25,bord=0):
    im=Image.open(os.path.join(D,f)).convert('RGB'); W,H=im.size
    px=im.load()
    xs=[x for x in range(bord,W-bord) if any(abs(lum(px[x,y])-fond)>seuil for y in range(y0,y1+1))]
    if not xs: print(f"    {nom}: RIEN"); return
    g,d=xs[0]-bord,(W-bord-1)-xs[-1]
    print(f"    {nom:50s} x={xs[0]:4d}..{xs[-1]:4d} | marge G={g:4d} px ({g/fac:5.1f} CSS)  D={d:4d} px ({d/fac:5.1f} CSS)")

print("=== mesure du CADRE de telephone des maquettes (largeur des bords sombres) ===")
for f in ['etats/ecran-canon-vide.png','etats/v4-29.png']:
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load(); W,H=im.size
    print(f"  OUVERT {f} -> {W}x{H}")
    y=876
    print("    ligne y=876, 24 premieres colonnes :", [round(lum(px[x,y])) for x in range(24)])

print()
print("=== CAPTURE 1080x2400 (contenu x3,6 ; PAS de cadre : bord=0) ===")
print("  OUVERT capture-1080x2400.png ->", Image.open(os.path.join(D,'capture-1080x2400.png')).size)
marges('capture-1080x2400.png',140,143,13.0,2.7551,'CONTROLE - : filet du bandeau',seuil=8)
marges('capture-1080x2400.png',268,303,13.0,3.6,'CONTROLE + : titre "LA SEMAINE"')
marges('capture-1080x2400.png',472,509,13.0,3.6,'SUJET : ligne "Au calme - aucune ... en cours"')
print("=== CANON SERIE 2 'aucune semaine' 900x1752 (x3,0 ; bord=16) ===")
marges('etats/ecran-canon-vide.png', 60, 98,11.0,3.0,'titre "LA COMPRESSION"',bord=16)
marges('etats/ecran-canon-vide.png',265,720,11.0,3.0,'PLAQUE entiere (cadre compris)',bord=16)
marges('etats/ecran-canon-vide.png',362,470,12.0,3.0,'titre de plaque "Rien ne presse..."',bord=16)
marges('etats/ecran-canon-vide.png',1175,1290,11.0,3.0,'boite d etat vide (pointilles compris)',bord=16)
print("=== v4-29 900x1752 (x3,0 ; bord=16) ===")
marges('etats/v4-29.png',612,668,27.0,3.0,'ligne de lecture "Calme - vos affaires respirent"',seuil=30,bord=16)
marges('etats/v4-29.png',690,1040,27.0,3.0,'PLAQUE entiere',seuil=30,bord=16)
