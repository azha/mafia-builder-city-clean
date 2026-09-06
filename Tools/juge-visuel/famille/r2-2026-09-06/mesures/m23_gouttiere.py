# m23 — GOUTTIERE : le contenu d'ecran reste-t-il dans le rect libre entre bandeau et dock ?
# On mesure le bas du bandeau (dernier objet du chrome haut) et le haut du dock, puis on les
# confronte aux bornes de la feuille (y 232..2151 px, mesurees en m3).
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('CAPTURE',cap.size)
px=cap.load(); W,H=cap.size
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
print('\n-- bandeau : derniere ligne, au-dessus de y=260, portant un objet clair (L>60) --')
for y in range(0,300):
    xs=[x for x in range(0,W,2) if lum(px[x,y])>60]
    if xs: dernier=(y,len(xs),xs[0],xs[-1])
print('   dernier objet clair du haut :', dernier)
for y in range(120,260):
    xs=[x for x in range(0,W,2) if lum(px[x,y])>60]
    if xs: print(f'   y={y} n={len(xs)} x {xs[0]}..{xs[-1]}')
print('\n-- dock : premiere ligne sous y=2100 portant un objet clair --')
for y in range(2100,H):
    xs=[x for x in range(0,W,2) if lum(px[x,y])>55]
    if xs: print(f'   premier objet clair du bas : y={y} n={len(xs)} x {xs[0]}..{xs[-1]}'); break
print('\n-- feuille (mesuree m3) : y 232..2151 --')
print('   verdict : le bas du chrome haut et le haut du dock encadrent-ils la feuille ?')
