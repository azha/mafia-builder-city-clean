# m09 — CE QUE LE CHROME POSE SOUS SON FILET, et ce qu'il recouvre a 1920.
# Methode : a 2400 la bande y143..479 ne porte AUCUN contenu d'ecran (le cadre commence a 482) ;
#   tout ce qu'on y trouve est donc du CHROME. On mesure son emprise, puis on va chercher les MEMES
#   rangees dans la capture 1920, ou le cadre commence a 162.
# ENCRE := |c - fond de la rangee| > 25 (fond = mediane des colonnes 0..14 et 1066..1079 de la rangee).
# Controle positif : le medaillon (disque + anneau rouge) DOIT etre trouve — il est visible a l'oeil.
# Controle negatif : la meme sonde a x 0..200 (loin du medaillon) doit rendre 0 px dans la bande morte.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def fondrang(p,y):
    v=[[],[],[]]
    for x in list(range(0,15))+list(range(1066,1080)):
        c=p[x,y]
        for k in range(3): v[k].append(c[k])
    return tuple(sorted(a)[len(a)//2] for a in v)

cap=ouvrir('capture-1080x2400.png'); p=px(cap)
print("\n=== 2400 : ce que le chrome laisse SOUS son filet (y 143..479) ===")
comp={}
for y in range(143,480):
    b=fondrang(p,y)
    xs=[x for x in range(1080) if dist(p[x,y],b)>25]
    if xs: comp[y]=(min(xs),max(xs),len(xs))
ys=sorted(comp)
print(f"  rangees porteuses : {len(ys)} / 337 ; de y={ys[0]} a y={ys[-1]}")
seg=[]
for y in ys:
    if seg and y==seg[-1][-1]+1: seg[-1].append(y)
    else: seg.append([y])
for s in seg:
    xs0=min(comp[y][0] for y in s); xs1=max(comp[y][1] for y in s)
    n=sum(comp[y][2] for y in s)
    print(f"   bloc y {s[0]}..{s[-1]} ({len(s)} rangees) : x {xs0}..{xs1} ; {n} px")
print(f"  [controle negatif] px trouves a x<200 dans la bande : "
      f"{sum(1 for y in ys for x in range(200) if dist(p[x,y],fondrang(p,y))>25)}")
cap19=ouvrir('capture-1080x1920.png'); q=px(cap19)
print("\n=== 1920 : le cadre commence a y=162 — que devient cette emprise ? ===")
for s in seg:
    if s[-1] < 162: etat="au-dessus du cadre (OK)"
    elif s[0] > 164: etat=">>> DANS le cadre <<<"
    else: etat=">>> A CHEVAL sur le filet du cadre <<<"
    print(f"   bloc y {s[0]}..{s[-1]} : {etat}")
# le losange : bloc le plus bas
bas=seg[-1]
xs0=min(comp[y][0] for y in bas); xs1=max(comp[y][1] for y in bas)
print(f"\n  LOSANGE (bloc le plus bas) : x {xs0}..{xs1}, y {bas[0]}..{bas[-1]}"
      f" = {xs1-xs0+1}x{bas[-1]-bas[0]+1} px ; couleur au centre "
      f"{p[(xs0+xs1)//2,(bas[0]+bas[-1])//2]}")
print(f"  memes px a 1920 : couleur au centre {q[(xs0+xs1)//2,(bas[0]+bas[-1])//2]}"
      f" (identique => le losange est bien du chrome, ancre en haut)")
# ce qu'il y a SOUS le losange a 1920
print(f"  a 1920, le titre « Le miroir » occupe : ", end="")
ys2=[y for y in range(180,330) if sum(1 for x in range(200,900) if q[x,y][0]>150 and q[x,y][2]<130)>3]
print(f"y {min(ys2)}..{max(ys2)}")
