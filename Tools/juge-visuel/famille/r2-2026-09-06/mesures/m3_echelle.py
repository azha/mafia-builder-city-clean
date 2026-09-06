# m3 — ECHELLE et bornes verticales de la feuille. Toute mesure ulterieure cite ce facteur.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF',ref.size,'CAP',cap.size)
W,H=cap.size
col=[cap.getpixel((20,y)) for y in range(H)]   # x=20 : dans la feuille, hors de tout contenu
ys=[y for y in range(H) if col[y]!=(11,11,11)]
# bornes contigues autour de y=1500
y=1500
top=y
while col[top-1]!=(11,11,11): top-=1
bot=y
while col[bot+1]!=(11,11,11): bot+=1
print(f'feuille (x=20) : y {top} .. {bot}  hauteur {bot-top+1}')
print('  au-dessus :',[(yy,col[yy]) for yy in range(top-3,top+3)])
print('  au-dessous:',[(yy,col[yy]) for yy in range(bot-2,bot+4)])
LARG=1065-13+1
print(f'\nLARGEUR FEUILLE CAPTURE = {LARG} px  (x 13..1065)')
print(f'FACTEUR CAPTURE = {LARG}/560 = {LARG/560:.5f}')
print(f'FACTEUR REFERENCE = 1120/560 = {1120/560:.5f}')
print(f'hauteur feuille capture en CSS = {(bot-top+1)/(LARG/560):.1f}   (reference : {1850/2.0:.1f} CSS)')
