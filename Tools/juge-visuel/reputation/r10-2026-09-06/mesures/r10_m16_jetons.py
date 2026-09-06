# r10-m16 : couleur RENDUE de chaque aplat, mediane d'une fenetre 7x7 posee a >= 4 px de tout bord,
#  confrontee au JETON de chassis6.py qui la nomme.
# Controle positif : le filet dore du cadre doit rendre or_filet (176,141,62) des DEUX cotes.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
T={'fond':(11,16,22),'fond2':(13,15,16),'carte':(17,24,35),'carte2':(22,25,27),'rang':(35,42,45),
   'lisere':(42,54,72),'creme':(234,224,200),'creme2':(185,173,146),'or_filet':(176,141,62)}
IM={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
# (nom, jeton attendu, (u,v) REF, (u,v) CAP)  -- points derives des masques mesures en m12/m15
PTS=[("filet dore du cadre (CONTROLE POSITIF)","or_filet",(272,1),(272,1)),
     ("visage (joue, sous l'oeil)","creme2",(272,730),(255,726)),
     ("cou","creme2",(272,790),(255,790)),
     ("col (triangle, tiers haut)","creme",(272,850),(255,840)),
     ("torse (epaule gauche)","carte2",(170,930),(150,925)),
     ("fond de la carte .prt","carte",(100,470),(95,462)),
     ("fond du panneau .elast","fond2",(500,1120),(500,1130)),
     ("fond d'une tuile .tl (tuile 3)","fond2",(560,800),(560,750)),
     ("liseré d'une tuile .tl","lisere",(700,779),(700,731)),
     ("fond de la fenetre .fen (centre)","fond2",(300,300),(300,295)),
     ("fond du panneau .pann","fond2",(80,1250),(80,1260)),
     ("fond du CTA .cta6","carte2",(80,1550),(80,1550)),
     ("fond du cadre (gouttiere gauche)",None,(10,900),(10,900))]
def med(px,x0,y0,u,v):
    vals=[px[x0+u+dx,y0+v+dy] for dx in range(-3,4) for dy in range(-3,4)]
    return tuple(sorted(c[i] for c in vals)[len(vals)//2] for i in range(3))
L={k:Image.open(p).convert("RGB") for k,(p,_,_) in IM.items()}
for k,im in L.items(): print(f"{k} taille={im.size}")
PX={k:im.load() for k,im in L.items()}
print(f"\n{'aplat':38s} {'jeton':>17s} {'REF':>16s} {'CAP':>16s}  d(REF,jeton) d(CAP,jeton) d(REF,CAP)")
for nom,jt,(ur,vr),(uc,vc) in PTS:
    a=med(PX["REF"],21,452,ur,vr); b=med(PX["CAP"],18,18,uc,vc)
    j=T.get(jt)
    dj=lambda x: (max(abs(x[i]-j[i]) for i in range(3)) if j else "-")
    print(f"{nom:38s} {str(j):>17s} {str(a):>16s} {str(b):>16s}     {dj(a)!s:>6}      {dj(b)!s:>6}      "
          f"{max(abs(a[i]-b[i]) for i in range(3))}")
