# r10-m17 : couleurs d'aplat, points RE-DERIVES des bbox mesurees (m04/m05/m06/m12).
# Controle positif : (1) le visage doit rendre creme2 exactement des deux cotes (deja vu en m16) ;
#                    (2) le filet dore du CADRE doit rendre or_filet des deux cotes.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
T={'fond':(11,16,22),'fond2':(13,15,16),'carte':(17,24,35),'carte2':(22,25,27),'rang':(35,42,45),
   'lisere':(42,54,72),'creme':(234,224,200),'creme2':(185,173,146),'or_filet':(176,141,62)}
IM={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
PTS=[("filet dore du cadre, bord gauche (CONTROLE +)","or_filet",(22,800),(19,800)),
     ("filet dore de la carte .prt, bord gauche","or_filet",(62,700),(55,700)),
     ("visage (joue) (CONTROLE +)","creme2",(272,730),(255,726)),
     ("col (triangle)","creme",(272,850),(255,840)),
     ("gant (ellipse basse gauche), remplissage","rang",(170,930),(150,925)),
     ("torse (epaule droite, aplat)","carte2",(350,930),(340,925)),
     ("fond de la carte .prt","carte",(100,470),(95,462)),
     ("fond du panneau .elast (sous les tuiles)","fond2",(700,1100),(700,1120)),
     ("fond d'une tuile .tl (tuile 3, a droite du texte)","fond2",(940,830),(940,780)),
     ("liseré de la tuile 3 (bord haut)","lisere",(900,780),(900,732)),
     ("fond de la fenetre .fen 1 (bas gauche)","fond2",(60,345),(60,342)),
     ("fond du panneau .pann (bas droite)","fond2",(950,1440),(950,1445)),
     ("fond du CTA .cta6 (gauche)","carte2",(80,1550),(80,1555)),
     ("fond du cadre, gouttiere gauche (v=900)",None,(10,900),(10,900))]
def med(px,x0,y0,u,v):
    vals=[px[x0+u+dx,y0+v+dy] for dx in range(-3,4) for dy in range(-3,4)]
    return tuple(sorted(c[i] for c in vals)[len(vals)//2] for i in range(3))
L={k:Image.open(p).convert("RGB") for k,(p,_,_) in IM.items()}
for k,im in L.items(): print(f"{k} taille={im.size}")
P={"REF":(L["REF"].load(),21,452),"CAP":(L["CAP"].load(),18,18)}
print(f"\n{'aplat':46s} {'jeton':>17s} {'REF':>16s} {'CAP':>16s}  dREF dCAP dRC")
for nom,jt,(ur,vr),(uc,vc) in PTS:
    a=med(*P["REF"],ur,vr); b=med(*P["CAP"],uc,vc); j=T.get(jt)
    f=lambda x: (max(abs(x[i]-j[i]) for i in range(3)) if j else -1)
    print(f"{nom:46s} {str(j):>17s} {str(a):>16s} {str(b):>16s}  {f(a):4d} {f(b):4d} "
          f"{max(abs(a[i]-b[i]) for i in range(3)):3d}")
