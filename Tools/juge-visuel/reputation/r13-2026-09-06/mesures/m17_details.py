# m17 — DETAILS : en-tete de la colonne droite, aparte, tuiles, vide du pied, col, montre, bouche.
# Boites derivees de m12 (filets de panneau) ; jamais choisies a l'oeil.
# ENCRE := distance de Chebyshev > 30 au fond local imprime.  Convention de bord : mi-alpha nominal.
# Controle positif : le pas des tuiles et leur largeur doivent se retrouver a 1 px pres par deux
#   chemins (filets de m12 et sonde d'encre d'ici).
# Controle negatif : les memes sondes de couleur exacte (creme du col, cadran) appliquees a une zone
#   sans col ni montre doivent rendre 0 px.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
pr,pc=px(ref),px(cap)

def lignes(p,box,fond,seuil=30,trou=4):
    x0,y0,x1,y1=box; rows={}
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if dist(p[x,y],fond)>seuil]
        if xs: rows[y]=xs
    ys=sorted(rows); seg=[]
    for y in ys:
        if seg and y-seg[-1][-1]<=trou: seg[-1].append(y)
        else: seg.append([y])
    return [(s[0],s[-1],min(min(rows[y]) for y in s),max(max(rows[y]) for y in s)) for s in seg]

print("\n=== en-tete de la colonne droite (« Pas encore / jugeable ») ===")
for nm,p,box,f in (('REF',pr,(530,880,780,1000),(11,13,14)),('JEU',pc,(530,900,780,1000),(13,13,13))):
    L=lignes(p,box,f,trou=3)
    print(f"  {nm} : {len(L)} ligne(s) {[(a,b,b-a+1) for a,b,c,d in L]}"
          f" ; pas haut-a-haut {[L[i+1][0]-L[i][0] for i in range(len(L)-1)]}")
print("\n=== aparte « ce qu'il a absorbe de vos regles » ===")
for nm,p,box,f in (('REF',pr,(780,880,1000,1000),(11,13,14)),('JEU',pc,(780,900,1000,1000),(13,13,13))):
    L=lignes(p,box,f,trou=3)
    print(f"  {nm} : {len(L)} ligne(s) {[(a,b,d-c+1) for a,b,c,d in L]}"
          f" ; pas {[L[i+1][0]-L[i][0] for i in range(len(L)-1)]}")
print("\n=== tuiles : boites (filets de m12) ===")
TR=[(1000,1100),(1115,1215),(1231,1330),(1346,1446)]
TC=[( 997,1089),(1105,1196),(1211,1303),(1319,1410)]
print(f"  REF hauteurs {[b-a+1 for a,b in TR]} ; pas {[TR[i+1][0]-TR[i][0] for i in range(3)]}"
      f" ; gouttieres {[TR[i+1][0]-TR[i][1]-1 for i in range(3)]}")
print(f"  JEU hauteurs {[b-a+1 for a,b in TC]} ; pas {[TC[i+1][0]-TC[i][0] for i in range(3)]}"
      f" ; gouttieres {[TC[i+1][0]-TC[i][1]-1 for i in range(3)]}")
def largeur_tuile(p,y,fond):
    xs=[x for x in range(505,1010) if dist(p[x,y],fond)>18]
    return (min(xs),max(xs),max(xs)-min(xs)+1)
print(f"  largeur tuile 1 : REF {largeur_tuile(pr,1001,(12,14,15))} ; JEU {largeur_tuile(pc,998,(13,13,13))}")
print("\n=== vide du pied (sous la 4e tuile / sous la carte, dans le panneau elastique) ===")
print(f"  REF : .elast 848..1613 (766 px) ; 4e tuile finit 1446 ; vide {1611-1446} px"
      f" = {100*(1611-1446)/766:.1f} % ; carte finit 1532 ; vide {1611-1532} px")
print(f"  JEU : .elast 874..1657 (784 px) ; 4e tuile finit 1410 ; vide {1655-1410} px"
      f" = {100*(1655-1410)/784:.1f} % ; carte finit 1560 ; vide {1655-1560} px")
print("\n=== col (triangle creme) ===")
def masque(p,box,c,tol=6):
    x0,y0,x1,y1=box
    q=[(x,y) for y in range(y0,y1) for x in range(x0,x1) if dist(p[x,y],c)<=tol]
    if not q: return None
    xs=[a for a,b in q]; ys=[b for a,b in q]
    return (min(xs),max(xs),min(ys),max(ys),len(q))
for nm,p,box in (('REF',pr,(200,1250,400,1400)),('JEU',pc,(196,1280,400,1430))):
    m=masque(p,box,(234,224,200))
    if m:
        w=m[1]-m[0]+1; h=m[3]-m[2]+1
        print(f"  {nm} : boite {w}x{h} px, aire {m[4]}, remplissage aire/boite {m[4]/(w*h):.3f},"
              f" centre x {(m[0]+m[1])/2:.1f}")
print("\n=== montre (cadran) ===")
for nm,p,box,c in (('REF',pr,(120,1300,260,1400),(35,42,45)),('JEU',pc,(116,1330,260,1430),(34,42,46))):
    m=masque(p,box,c,tol=3)
    if m: print(f"  {nm} : {m[1]-m[0]+1}x{m[3]-m[2]+1} px, aire {m[4]},"
                f" centre ({(m[0]+m[1])/2:.1f},{(m[2]+m[3])/2:.1f})")
print("\n=== bouche (trait sombre dans le visage) ===")
for nm,p,y0,y1,c in (('REF',pr,1180,1230,(11,16,22)),('JEU',pc,1210,1260,(13,13,22))):
    q=[(x,y) for y in range(y0,y1) for x in range(240,350) if dist(p[x,y],c)<=12]
    xs=[a for a,b in q]; ys=[b for a,b in q]
    print(f"  {nm} : x {min(xs)}..{max(xs)} = {max(xs)-min(xs)+1} px ; y {min(ys)}..{max(ys)}"
          f" = {max(ys)-min(ys)+1} px ; encre {len(q)} px ; epaisseur moyenne {len(q)/(max(xs)-min(xs)+1):.1f} px")
print("\n  [controle negatif] sonde creme du col dans une zone SANS col (REF x600..700, y1250..1350) :",
      masque(pr,(600,1250,700,1350),(234,224,200)))
