"""m26 — CTA, enseigne, entete de colonne droite, col (triangle), globales.
Controle positif : la largeur du panneau bas doit etre identique a celle de la boite du CTA
                   dans la REFERENCE (meme colonne de mise en page).
Controle negatif : le detecteur de triangle applique a un RECTANGLE (la boite du CTA) doit
                   rendre un taux de remplissage ~1,0 et non ~0,5.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
def est_or(c):
    r,g,b=c; return r>110 and (r-b)>45 and g>70 and g<r
def creme(c): return c[0]>200 and c[1]>190 and c[2]>170 and (c[0]-c[2])<70

R=ouvrir('reference-1080x2102.png'); J=ouvrir('capture-1080x2400.png'); J9=ouvrir('capture-1080x1920.png')
def cta(im,nom,y0,y1):
    p=im.load()
    rows=[(y,sum(1 for x in range(40,1045) if est_or(p[x,y]))) for y in range(y0,y1)]
    b=bandes(rows,600)
    cols=[(x,sum(1 for y in range(y0,y1) if est_or(p[x,y]))) for x in range(40,1045)]
    bc=bandes(cols,int(0.5*(b[-1][1]-b[0][0])))
    print(f"  [{nom}] boite CTA : filets y{b[0][0]}..{b[-1][1]} (h={b[-1][1]-b[0][0]+1})  rails x{bc[0][0]}..{bc[-1][1]} (w={bc[-1][1]-bc[0][0]+1})")
cta(R,'REF',1945,2055); cta(J,'JEU2400',1875,1980)

def enseigne(im,nom,ycadre):
    p=im.load()
    rows=[(y,sum(1 for x in range(60,1020) if est_or(p[x,y]))) for y in range(ycadre+120,ycadre+280)]
    b=bandes(rows,600)
    print(f"  [{nom}] filet OR sous l'enseigne : y{b[0][0]}..{b[0][1]}  offset depuis le filet du cadre = {b[0][0]-ycadre}..{b[0][1]-ycadre}")
enseigne(R,'REF',452); enseigne(J,'JEU2400',482); enseigne(J9,'JEU1920',250)

def entete(im,nom,x0,x1,y0,y1):
    p=im.load()
    fond=mediane([lum(p[x,y]) for y in range(y0,y1) for x in range(x0,x1,3)])
    rows=[(y,sum(1 for x in range(x0,x1) if lum(p[x,y])>=fond+40)) for y in range(y0,y1)]
    b=bandes(rows,10)
    print(f"  [{nom}] entete colonne droite : bandes {[(a,c) for a,c,_ in b]}")
    if len(b)>=2: print(f"      pas haut-a-haut ligne1->ligne2 = {b[1][0]-b[0][0]} px")
entete(R,'REF',530,760,880,990); entete(J,'JEU2400',445,700,900,1000)

def triangle(im,nom,x0,x1,y0,y1):
    p=im.load()
    pts=[(x,y) for y in range(y0,y1+1) for x in range(x0,x1+1) if creme(p[x,y])]
    if not pts: print(f"  [{nom}] col : rien"); return
    xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
    w=max(xs)-min(xs)+1; h=max(ys)-min(ys)+1
    print(f"  [{nom}] col creme : bbox {w}x{h} = {w*h} px de boite, aire d'encre {len(pts)} px, remplissage {len(pts)/(w*h):.2f}"
          f"  centre x={(min(xs)+max(xs))/2:.1f}")
triangle(R,'REF',230,360,1255,1330); triangle(J,'JEU2400',210,360,1330,1420)
# ctrl negatif du detecteur de triangle : la boite du CTA (rectangle plein)
p=R.load()
pts=[(x,y) for y in range(1955,2044) for x in range(55,1025) if est_or(p[x,y])]
xs=[q[0] for q in pts]; ys=[q[1] for q in pts]
print(f"  [ctrl negatif triangle] boite CTA (rectangle) : remplissage = {len(pts)/((max(xs)-min(xs)+1)*(max(ys)-min(ys)+1)):.2f} (attendu != 0,5)")

print()
for im,nom,zone in ((R,'REF',(24,452,1056,2078)),(J,'JEU2400',(21,482,1059,2109)),(J9,'JEU1920',(21,250,1059,1629))):
    p=im.load(); x0,y0,x1,y1=zone
    vals=[lum(p[x,y]) for y in range(y0,y1+1,3) for x in range(x0,x1+1,3)]
    enc=sum(1 for v in vals if v>45)
    print(f"  [{nom}] cadre : luminance moyenne = {sum(vals)/len(vals):.2f} ; densite d'encre (L>45) = {100*enc/len(vals):.2f} %")
