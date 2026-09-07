"""m21 — metriques de texte : bandes d'encre, hauteur de bbox, largeur, encre, contraste.
Encre = pixel dont la luminance depasse le fond local (mediane de la bande) de >= 25 pts.
Hauteur de CAPITALE = hauteur de la bbox de la bande pour les libelles TOUT EN CAPITALES ;
pour les bandes en casse mixte on la mesure sur la lettre initiale (colonne la plus haute).
Controle positif : les 3 lignes du paragraphe du panneau bas doivent sortir a pas regulier.
Controle negatif : une bande sans texte doit rendre 0 bande.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *

def bandes_texte(im,x0,x1,y0,y1,seuil=25,minpx=8):
    p=im.load(); out=[]
    fond=mediane([lum(p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1,3)])
    rows=[]
    for y in range(y0,y1+1):
        n=sum(1 for x in range(x0,x1+1) if lum(p[x,y])>=fond+seuil)
        rows.append((y,n))
    b=bandes(rows,minpx)
    res=[]
    for a,c,_ in b:
        pts=[(x,y) for y in range(a,c+1) for x in range(x0,x1+1) if lum(p[x,y])>=fond+seuil]
        if len(pts)<40: continue
        xs=[q[0] for q in pts]
        col=mediane_couleur_pts(im,[q for q in pts if lum(p[q[0],q[1]])>=fond+70] or pts)
        res.append(dict(y0=a,y1=c,h=c-a+1,x0=min(xs),x1=max(xs),w=max(xs)-min(xs)+1,
                        encre=len(pts),couleur=col,contraste=round(contraste(col,couleur_fond(im,x0,x1,a,c)),2)))
    return res,fond

def mediane_couleur_pts(im,pts):
    p=im.load()
    R=[p[x,y][0] for x,y in pts];G=[p[x,y][1] for x,y in pts];B=[p[x,y][2] for x,y in pts]
    return (round(mediane(R)),round(mediane(G)),round(mediane(B)))

def couleur_fond(im,x0,x1,y0,y1):
    p=im.load()
    vals=[(lum(p[x,y]),p[x,y]) for y in range(y0,y1+1) for x in range(x0,x1+1)]
    vals.sort(key=lambda t:t[0])
    return vals[len(vals)//4][1]

ZONES = {
 'reference-1080x2102.png': [
   ("titre + sous-titre",    (60,1020,  484,662)),
   ("carte : titre + vert",  (86,500,   884,1420)),
   ("colonne droite",        (515,1010, 840,1470)),
   ("panneau bas",           (80,1000,  1655,1915)),
   ("CTA",                   (60,1020,  1960,2040)),
 ],
 'capture-1080x2400.png': [
   ("titre + sous-titre",    (60,1020,  514,686)),
   ("carte : titre + vert",  (82,498,   910,1500)),
   ("colonne droite",        (450,1010, 750,1420)),
   ("panneau bas",           (80,1000,  1592,1845)),
   ("CTA",                   (60,1020,  1890,1965)),
 ],
}
for nom,zs in ZONES.items():
    print("="*74); im=ouvrir(nom)
    for lab,(x0,x1,y0,y1) in zs:
        res,f=bandes_texte(im,x0,x1,y0,y1)
        print(f"  [{lab}] fond={f:.1f}")
        for r in res:
            print(f"    y{r['y0']}..{r['y1']} h={r['h']:3d}  x{r['x0']}..{r['x1']} w={r['w']:4d}  encre={r['encre']:6d}  couleur={r['couleur']}  contraste={r['contraste']}")
