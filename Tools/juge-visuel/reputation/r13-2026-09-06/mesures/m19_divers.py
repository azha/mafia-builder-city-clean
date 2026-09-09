# m19 — DIVERS : ronds du dock, tiret ENFREINTES, position du reflet, planches « ecran seul ».
# Controle positif : le libelle de la carte doit compter 2 lignes sur les planches ou le nom est arrive.
# Controle negatif : la sonde de rond du dock ne doit rien trouver au milieu de l'ecran.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
can=ouvrir('hud-canon-1176.png'); cap=ouvrir('capture-1080x2400.png')
canr=can.resize((1080,1920)); pk,pc=px(canr),px(cap)
print("\n=== ronds du dock (diametre du cercle le plus a gauche) ===")
def rond(p,y0,y1,x0,x1,fond):
    ys=[];xs=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if dist(p[x,y],fond)>10: ys.append(y); xs.append(x)
    return (min(xs),max(xs),min(ys),max(ys)) if xs else None
r1=rond(pk,1640,1850,150,330,mediane_fenetre(pk,60,1740,5))
r2=rond(pc,2140,2320,150,330,mediane_fenetre(pc,60,2240,5))
print(f"  canon ramene : {r1}  -> {r1[1]-r1[0]+1}x{r1[3]-r1[2]+1}")
print(f"  capture      : {r2}  -> {r2[1]-r2[0]+1}x{r2[3]-r2[2]+1}")
print("\n=== compteur 3 : le tiret ENFREINTES ===")
ref=ouvrir('reference-1080x2102.png'); pr=px(ref)
def encre_cyan(p,box):
    x0,y0,x1,y1=box
    q=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if dist(p[x,y],(127,212,217))<=30]
    xs=[a for a,b in q]; ys=[b for a,b in q]
    return (min(xs),max(xs),min(ys),max(ys),len(q)) if q else None
print("  REF compteur 3 (00)  :", encre_cyan(pr,(700,700,1030,800)))
print("  JEU compteur 3 (—)   :", encre_cyan(pc,(700,730,1050,830)))
print("  JEU compteur 1 (00)  :", encre_cyan(pc,(60,730,360,830)))
print("  -> meme couleur d'encre (127,212,217) ; le tiret est-il centre comme les chiffres ?")
for nm,bb,boite in (('compteur 1 JEU',encre_cyan(pc,(60,730,360,830)),(46,361)),
                    ('compteur 3 JEU',encre_cyan(pc,(700,730,1050,830)),(719,1034))):
    cx=(bb[0]+bb[1])/2; bc=(boite[0]+boite[1])/2
    print(f"   {nm} : centre d'encre {cx:.1f} ; centre de boite {bc:.1f} ; ecart {cx-bc:+.1f} px"
          f" ; y {bb[2]}..{bb[3]}")
print("\n=== position du reflet (ligne de balayage) dans le panneau elastique ===")
print(f"  REF : .elast 848..1613 (766 px) ; pic a y=1090 -> {(1090-848)/766*100:.1f} % de la hauteur")
print(f"  JEU : .elast 874..1657 (784 px) ; pic a y=1104 -> {(1104-874)/784*100:.1f} % de la hauteur")
print("\n=== planches « ecran seul » : rien de coupe ? ===")
for f,H in (('capture-ecran-seul-1080x2400.png',2400),('capture-ecran-seul-1080x1920-T.png',1920),
            ('capture-ecran-seul-1080x1920-T+1s.png',1920)):
    im=ouvrir(f); p=px(im)
    def ligne_non_vide(y):
        b=mediane_fenetre(p,7,y,6)
        return sum(1 for x in range(1080) if dist(p[x,y],b)>25)
    print(f"   {f} : encre a la rangee 8 {ligne_non_vide(8)} px ; a la rangee H-9 {ligne_non_vide(H-9)} px")
print("\n=== le nom du lieutenant, planche par planche (libelle de la carte) ===")
for f,box,fond in (('capture-1080x2400.png',(90,910,495,1015),(13,22,34)),
                   ('capture-1080x1920.png',(90,590,495,700),(13,22,34)),
                   ('capture-ecran-seul-1080x2400.png',(90,910,495,1015),(13,22,34)),
                   ('capture-ecran-seul-1080x1920-T.png',(90,590,495,700),(13,22,34)),
                   ('capture-ecran-seul-1080x1920-T+1s.png',(90,590,495,700),(13,22,34))):
    im=ouvrir(f); p=px(im); x0,y0,x1,y1=box
    rows=[y for y in range(y0,y1) if sum(1 for x in range(x0,x1) if dist(p[x,y],fond)>30)>2]
    seg=[]
    for y in rows:
        if seg and y-seg[-1][-1]<=4: seg[-1].append(y)
        else: seg.append([y])
    print(f"   {f:45s} : {len(seg)} ligne(s) {[(s[0],s[-1]) for s in seg]}")
print("\n  [controle negatif] sonde de rond au milieu de l'ecran (x150..330, y1600..1750) :",
      rond(pc,1600,1750,150,330,mediane_fenetre(pc,240,1675,5)) is not None)
