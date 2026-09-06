# m13 — COUCHE GLOBALE du CADRE (le contenu de l'ecran, chrome exclu) : palette, luminance, densite.
# Perimetre : REF y452..2078 x21..1058 ; JEU y482..2109 x18..1061 (filet a filet, hors-tout).
# Palette : histogramme quantifie a 16 niveaux par canal, 8 premieres classes, en % de l'aire.
# Densite d'encre : part des px dont la luminance depasse 40 (le fond du cadre est a ~20).
# Controle positif : la couleur des matieres nommees (fond de carte, peau, creme, or, cyan, filet)
#   doit etre EGALE des deux cotes a <= 6/255 (tolerance d'aplat du mandat).
# Controle negatif : deux fenetres de 40x40 prises dans le MEME aplat doivent rendre <= 2/255.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from collections import Counter

def couche(im,nom,box):
    r=im.crop(box); W,H=r.size
    q=[(c[0]//16*16+8, c[1]//16*16+8, c[2]//16*16+8) for c in r.getdata()]
    cn=Counter(q); tot=len(q)
    print(f"\n=== {nom} — cadre {box} ({W}x{H} = {tot} px) ===")
    print("  palette (classes de 16) :")
    for c,k in cn.most_common(8): print(f"     {c}  {100*k/tot:5.2f} %")
    L=[lum(c) for c in r.getdata()]
    print(f"  luminance moyenne = {sum(L)/tot:.2f} ; mediane = {sorted(L)[tot//2]:.2f}")
    print(f"  densite d'encre (L>40) = {100*sum(1 for v in L if v>40)/tot:.2f} %")
    return cn,tot

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
couche(ref,'REFERENCE',(21,452,1059,2079))
couche(cap,'CAPTURE 2400',(18,482,1062,2110))
print("\n=== jetons : mediane d'une fenetre 9x9 au coeur de chaque aplat ===")
JET=[('fond du cadre',(540,470),(540,500)),
     ('panneau enseigne',(140,500),(140,530)),
     ('fond de carte portrait',(120,1000),(116,1026)),
     ('peau du visage',(293,1170),(291,1195)),
     ('creme du col',(279,1290),(276,1316)),
     ('filet or du cadre',(22,1200),(19,1230)),
     ('cyan des chiffres',(175,743),(176,767)),
     ('libelle de compteur',(0,0),(0,0)),
     ('torse',(200,1420),(196,1450)),
     ('pastille de tuile',(559,1000),(0,0)),
     ('panneau bas',(540,1750),(540,1780)),
     ('boite du CTA',(540,2000),(540,2030))]
pr,pc=px(ref),px(cap)
for nom,a,b in JET:
    if a==(0,0) or b==(0,0): continue
    ca=mediane_fenetre(pr,a[0],a[1],4); cb=mediane_fenetre(pc,b[0],b[1],4)
    print(f"   {nom:26s} REF {str(ca):18s} JEU {str(cb):18s} Δ = {dist(ca,cb)}/255")
print("\n  [controle negatif] deux fenetres du MEME aplat (fond de carte REF, x120 vs x140) : "
      f"{dist(mediane_fenetre(pr,120,1000,4), mediane_fenetre(pr,140,1000,4))}/255")
