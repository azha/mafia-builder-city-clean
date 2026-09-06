# m01 — geometrie : bandes horizontales (chrome haut / contenu / dock) par profil de luminance
# Controle positif : largeur des deux images == 1080 (impose par le dossier)
# Controle negatif : la ligne y=5 de la capture (bandeau) doit differer de la ligne y=1200 (vide)
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
for name in ["reference-1080x2102.png","capture-1080x2400.png"]:
    im=Image.open(D+name).convert("RGB"); W,H=im.size
    print("=== %s  taille=%dx%d" % (name,W,H))
    assert W==1080, "controle positif largeur"
    px=im.load()
    prof=[]
    for y in range(H):
        s=0.0
        for x in range(0,W,4): s+=lum(px[x,y])
        prof.append(s/(W//4))
    # imprime le profil moyenne par tranche de 10 px, seulement les transitions fortes
    print("  y : lum moyenne (echantillon 1/4 colonnes) — transitions |d|>3 entre y et y+1")
    for y in range(H-1):
        d=prof[y+1]-prof[y]
        if abs(d)>3.0:
            print("   y=%4d  %6.2f -> %6.2f   d=%+6.2f" % (y,prof[y],prof[y+1],d))
    print("  lum y=5=%.2f  y=1200=%.2f  (controle negatif: doivent differer)"%(prof[5],prof[min(1200,H-1)]))
