# m18 — epaisseur des traits : profils bruts sur une coupe perpendiculaire.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def prof(im,y,x0,x1,label,S,OX):
    px=im.load()
    print('  %s (y=%d) :'%(label,y))
    print('    ',' '.join('%d:%s'%(x,px[x,y]) for x in range(x0,x1)))
print('\n--- PUCE : coupe horizontale au milieu du contour gauche ---')
prof(ref,1390,300,316,'REF puce (rang3)',2.0,0)
prof(cap,1614,294,312,'CAP puce (rang3)',1.88036,13)
print('\n--- BOUTON RETOUR : coupe horizontale au centre du cercle ---')
prof(ref,124,46,64,'REF retour',2.0,0)
prof(cap,341,56,74,'CAP retour',1.88036,13)
print('\n--- CADRE .vide : coupe verticale sur un plein du pointille ---')
def profv(im,x,y0,y1,label):
    px=im.load()
    print('  %s (x=%d) :'%(label,x))
    print('    ',' '.join('%d:%s'%(y,px[x,y]) for y in range(y0,y1)))
profv(ref,300,732,745,'REF vide bord haut')
profv(cap,300,941,956,'CAP vide bord haut')
