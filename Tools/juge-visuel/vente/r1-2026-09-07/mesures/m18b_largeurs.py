# m18b — LARGEURS, bornees a l'INTERIEUR du cerne (x 25..1055) pour ne pas attraper le cadre du .tel.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
im=Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB'); px=im.load()
print('OUVERT reference-1080x2102.png', im.size)
def bornes(y,x0,x1,seuil):
    g=d=None
    for x in range(x0,x1):
        if lum(px[x,y])>seuil: g=x;break
    for x in range(x1-1,x0-1,-1):
        if lum(px[x,y])>seuil: d=x;break
    return g,d
lignes=[('cerne (panneau)',1200,40,5,1075),('enseigne',500,22,25,1055),('fen 1',700,22,25,380),
        ('fen 2',700,22,390,700),('fen 3',700,22,710,1055),('elast',1500,18,25,1055),
        ('rangee .dl Oskar',900,18,25,1055),('cta6',1950,40,25,1055)]
for nom,y,s,x0,x1 in lignes:
    g,d=bornes(y,x0,x1,s)
    print('  %-20s y=%4d : x=%4d..%4d  largeur=%4d px = %6.1f CSS'%(nom,y,g,d,d-g+1,(d-g+1)/3.6))
print()
print('CAPTURE (rappel m07b/m08) : carte 1010 px = 280,6 CSS ; bouton RAMASSER x=71..1008 = 938 px = 260,6 CSS')
print()
print('CONTROLE POSITIF : les 3 .fen doivent avoir la MEME largeur a 2 px pres')
g1=bornes(700,25,380,22); g2=bornes(700,390,700,22); g3=bornes(700,710,1055,22)
L=[g1[1]-g1[0]+1,g2[1]-g2[0]+1,g3[1]-g3[0]+1]
print('  largeurs des 3 fenetres :',L,' ecart max =',max(L)-min(L),'px')
print('CONTROLE NEGATIF : enseigne (%d) != fen (%d)'%(bornes(500,25,1055,22)[1]-bornes(500,25,1055,22)[0]+1, L[0]))
