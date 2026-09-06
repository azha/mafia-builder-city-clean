#!/usr/bin/env python3
"""m23 - mesures de cloture :
 (a) GOUTTIERE : le contenu deborde-t-il sous le bandeau ou sous le dock ?
 (b) MARGES de la carte (mesurees a mi-hauteur, pas sur la bbox : la carte de reference est inclinee)
 (c) POIDS VISUEL : ou se trouve la masse contrastee (ordre de lecture)
 (d) DEBORDEMENT / TRONCATURE de texte au bord des conteneurs
Controle positif (a) : les bornes du chrome mesurees en m04/m05 sont reutilisees, pas redevinees.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
ref=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print(f"[REF] {ref.size} [CAP] {cap.size}")

print("\n(a) GOUTTIERE (capture)")
print("   bandeau : y=0..142 (filet or mesure en m04) ; ornement du mano jusqu'a y=226 (m05)")
print("   dock    : premiere ligne encree y=2179 (m05)")
print("   contenu : y=1278..2130 (m05)")
print(f"   -> chevauchement bandeau/contenu : {'AUCUN' if 1278>226 else 'OUI'}")
print(f"   -> chevauchement dock/contenu    : {'AUCUN' if 2130<2179 else 'OUI'}  (marge {2179-2130} px)")

print("\n(b) MARGES LATERALES de la carte, mesurees a mi-hauteur")
def bord(im,y,x0,x1,pred,label):
    px=im.load()
    xs=[x for x in range(x0,x1) if pred(px[x,y])]
    print(f"   [{label}] y={y} : bord gauche x={min(xs)}  bord droit x={max(xs)}  largeur={max(xs)-min(xs)+1}")
    return min(xs),max(xs)
gr,dr=bord(ref,1151,0,900,lambda p:L(p)>140,'REF carte (mi-hauteur y=1151)')
gc,dc=bord(cap,1482,0,900,lambda p:L(p)>35,'CAP carte (mi-hauteur y=1482)')
print(f"   marge gauche  REF={gr} px  CAP={gc} px  ecart={gc-gr:+d}")
print(f"   marge droite  REF={1080-dr} px  CAP={1080-dc} px  ecart={(1080-dc)-(1080-dr):+d}")
print(f"   largeur carte REF={dr-gr+1}  CAP={dc-gc+1}  ecart={(dc-gc)-(dr-gr):+d} px ({((dc-gc+1)/(dr-gr+1)-1)*100:+.1f}%)")

print("\n(c) POIDS VISUEL — repartition de la masse contrastee dans le rect libre")
def masse(im,y0,y1,label,fond):
    px=im.load(); W=im.size[0]
    tiers=[0,0,0]; h=(y1-y0)//3
    for y in range(y0,y1):
        n=sum(1 for x in range(0,W,2) if max(abs(px[x,y][c]-fond[c]) for c in range(3))>25)
        i=min(2,(y-y0)//h); tiers[i]+=n
    t=sum(tiers) or 1
    print(f"   [{label}] rect libre y={y0}..{y1} -> encre par tiers : "
          f"haut {tiers[0]/t*100:5.1f}%  milieu {tiers[1]/t*100:5.1f}%  bas {tiers[2]/t*100:5.1f}%")
    return [v/t*100 for v in tiers]
a=masse(ref,211,2101,'REF',(20,25,35))
b=masse(cap,143,2178,'CAP',(13,13,13))
print(f"   -> deplacement de la masse vers le BAS : {b[2]-a[2]:+.1f} points ; perte dans le HAUT : {b[0]-a[0]:+.1f} points")

print("\n(d) DEBORDEMENT / TRONCATURE (capture) : encre touchant le bord d'un conteneur")
pc=cap.load()
# carte : bord or a x=35..699 ; le texte doit rester dedans
xs=[x for y in range(1300,1680) for x in range(0,1080) if L(pc[x,y])>70]
print(f"   encre de la zone carte : x={min(xs)}..{max(xs)} ; cadre or x=35..699")
print(f"   -> {'DEBORDE' if max(xs)>699+2 else 'contenue'} (le medaillon et son libelle sont HORS carte par construction)")
# bords d'ecran
tot=0
for y in range(143,2179):
    if L(pc[0,y])>30 or L(pc[1079,y])>30: tot+=1
print(f"   lignes ou de l'encre touche le bord d'ecran (x=0 ou x=1079) : {tot} -> {'TRONCATURE' if tot>5 else 'aucune'}")
