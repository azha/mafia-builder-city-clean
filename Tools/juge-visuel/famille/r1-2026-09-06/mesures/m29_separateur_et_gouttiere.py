# m29 — separateur de tete (etendue), gouttiere (rien sous le bandeau ni sous le dock), bas de feuille.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
gold=lambda p: p[0]>45 and p[0]-p[2]>12
def sep(im,y,x0,x1,label,S,OX):
    px=im.load(); xs=[x for x in range(x0,x1) if gold(px[x,y])]
    print('  %-22s y=%d  x=%d..%d | CSS %.1f..%.1f  l=%.1f'%(label,y,min(xs),max(xs),(min(xs)-OX)/S,(max(xs)-OX)/S,(max(xs)-min(xs)+1)/S))
sep(ref,230,0,1120,'REF separateur',2.0,0)
sep(cap,474,13,1066,'CAP separateur',1.88036,13)
print('\n-- capture : bandes horizontales de la fenetre entiere (contenu vs chrome) --')
px=cap.load()
prev=None
for y in range(0,2400):
    c=px[20,y]
    if prev is None or max(abs(c[i]-prev[i]) for i in range(3))>4:
        print('   x=20  y=%4d  %s'%(y,c))
    prev=c
