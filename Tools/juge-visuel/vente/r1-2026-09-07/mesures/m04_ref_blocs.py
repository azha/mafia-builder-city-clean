# m04 — REFERENCE : blocs internes du panneau, detectes par la couleur de bord #2a3648 (42,54,72)
# et par le laiton #b08d3e (176,141,62).
# Controle positif : la ligne y=454 (bord haut du cerne) doit sortir en LAITON.
# Controle negatif : une ligne au milieu du fond noir (y=1150 dans la liste) ne doit pas sortir en laiton.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D,'reference-1080x2102.png')).convert('RGB')
print('OUVERT reference-1080x2102.png', im.size)
px = im.load(); w,h = im.size

def proche(p, c, tol):
    return abs(p[0]-c[0])<=tol and abs(p[1]-c[1])<=tol and abs(p[2]-c[2])<=tol
BORD=(42,54,72); LAITON=(176,141,62)

print('CONTROLE POSITIF proche((176,141,62),LAITON,10) =', proche((176,141,62),LAITON,10))
print('CONTROLE NEGATIF proche((13,15,16),LAITON,10) =', proche((13,15,16),LAITON,10))
print()
print('lignes horizontales : compte de px proches de #2a3648 (bord) et de #b08d3e (laiton), x=30..1050')
for y in range(440, 2095):
    cb=0; cl=0
    for x in range(30,1050,2):
        p=px[x,y]
        if proche(p,BORD,14): cb+=1
        if proche(p,LAITON,22): cl+=1
    if cb>200 or cl>200:
        print(f'  y={y}  bord={cb*2}  laiton={cl*2}')
