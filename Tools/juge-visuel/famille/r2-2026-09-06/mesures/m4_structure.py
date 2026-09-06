# m4 — structure verticale : bandes d'encre par ligne, des deux cotes, en CSS.
# Controle positif : le nombre de bandes majeures doit etre le meme ordre de grandeur (tete + don + 3 rangs + 3 boites + recruter).
from PIL import Image
import os,sys
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF',ref.size,'CAP',cap.size)
REF=dict(im=ref, x0=0, x1=1119, y0=0, y1=1849, f=2.0, bg=(22,25,27))
CAP=dict(im=cap, x0=13, x1=1065, y0=232, y1=2151, f=1053/560, bg=(22,22,28))
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
for nom,S in (('REFERENCE',REF),('CAPTURE',CAP)):
    im=S['im']; px=im.load(); bgl=lum(S['bg']); f=S['f']
    print(f'\n===== {nom}  (facteur {f:.5f}) =====')
    prev=False; runs=[]
    for y in range(S['y0'],S['y1']+1):
        n=0
        for x in range(S['x0']+2,S['x1']-1,3):
            if abs(lum(px[x,y])-bgl)>6: n+=1
        on = n>40
        if on and not prev: start=y
        if (not on) and prev: runs.append((start,y-1))
        prev=on
    if prev: runs.append((start,S['y1']))
    for a,b in runs:
        print(f'  y {a}..{b}  ({b-a+1} px)  = CSS {(a-S["y0"])/f:7.1f} .. {(b-S["y0"])/f:7.1f}  h={(b-a+1)/f:6.1f}')
