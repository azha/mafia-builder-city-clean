# m10 — CAPTURE : chaque texte de la carte -> bbox d'encre, hauteur de CAPITALE, couleur mediane,
#        contraste sur le fond local.
# Controle positif : le titre or doit rendre la couleur d'un or (r>g>b, r-b>60).
# Controle negatif : une fenetre de fond pur doit rendre 0 px d'encre.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def relL(p):
    def f(c):
        c=c/255.0
        return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=relL(a),relL(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)

im=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); px=im.load()
print('OUVERT capture-1080x2400.png', im.size)
FOND=(13,13,13)

def mesure(nom,x0,x1,y0,y1,seuil=26):
    xs=[];ys=[];cols=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if lum(p)>seuil: xs.append(x);ys.append(y);cols.append(p)
    if not xs:
        print(f'  {nom:34s} : AUCUNE ENCRE (seuil {seuil})'); return
    cols.sort(key=lum); med=cols[len(cols)//2]; hi=cols[int(len(cols)*0.92)]
    h=max(ys)-min(ys)+1
    print(f'  {nom:34s} : bbox x={min(xs)}..{max(xs)} y={min(ys)}..{max(ys)}  h={h} px ({h/3.6:.2f} CSS)  w={max(xs)-min(xs)+1} px  couleur_med={med} couleur_p92={hi}  contraste/fond={contraste(hi,FOND):.2f}:1  npx={len(xs)}')

print('CONTROLE NEGATIF (fenetre de fond pur x400..700 y1500..1540) :')
mesure('fond pur',400,700,1500,1540)
print()
print('TEXTES DE LA CAPTURE :')
mesure('titre LES POINTS DE VENTE',100,980,260,310)
mesure('nom "Brindle"',180,470,370,430)
mesure('statut "AU POSTE"',860,1030,375,410)
mesure('libelle "Caisse"',60,180,432,470)
mesure('valeur "Moderate"',580,800,432,470)
mesure('libelle "Marge"',60,180,478,516)
mesure('valeur "Standard"',520,720,478,516)
mesure('CTA "RAMASSER"',640,1000,548,588)
mesure('sous-libelle du CTA',250,830,590,616)
print()
print('CHROME (pour memoire, juge a part) :')
mesure('ARGENT valeur',60,340,60,110)
mesure('JOUR 50',880,1040,25,55)
mesure('medaillon "Brulant"',460,620,155,185)
