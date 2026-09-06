# m4 — extension verticale de la feuille dans la capture + facteur d'echelle.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
print('OUVERT cap',cap.size,'ref',ref.size)
px=cap.load()
print('\ncolonne x=20 : transitions de couleur (y=0..2400)')
prev=px[20,0]; 
for y in range(1,2400):
    c=px[20,y]
    if max(abs(c[i]-prev[i]) for i in range(3))>3:
        print('  y=%4d %s -> %s'%(y,prev,c))
    prev=c
print('\nligne y=1900 : bords gauche/droit de la feuille')
row=[px[x,1900] for x in range(1080)]
xs=[x for x in range(1080) if row[x]!=(11,11,11)]
print('  premier x != (11,11,11) :',xs[0],' dernier :',xs[-1],' largeur =',xs[-1]-xs[0]+1)
print('  facteur = %.5f  (largeur/560)'%((xs[-1]-xs[0]+1)/560.0))
