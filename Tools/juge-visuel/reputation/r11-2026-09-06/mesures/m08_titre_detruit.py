#!/usr/bin/env python3
"""m08 - combien de l'encre du TITRE survit au 1080x1920 ?
Fenetre serree sur les glyphes de 'Le miroir' : x 325..760.
2400 : y 544..594 ; 1920 : les MEMES rangees moins 480 -> y 64..114.
Encre = pixel dore clair (r>g>b, luminance>90).
Controle positif : la meme fenetre au 2400 et a la REFERENCE doit rendre des
comptes voisins (le titre est identique des deux cotes, cf. r10 C13).
"""
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def compte(f,y0,y1,x0=325,x1=760):
    im=Image.open(os.path.join(D,f)).convert('RGB'); px=im.load()
    print('   ouvre', f, im.size)
    n=0; cols=set()
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            if p[0]>p[1]>p[2] and lum(p)>90: n+=1; cols.add(x)
    return n, len(cols)
n,c=compte('reference-1080x2102.png',511,561); print(f'  REF   y511..560 : {n} px d encre, {c} colonnes touchees')
n2,c2=compte('capture-1080x2400.png',544,594); print(f'  2400  y544..593 : {n2} px d encre, {c2} colonnes touchees')
n3,c3=compte('capture-1080x1920.png',64,114);  print(f'  1920  y 64..113 : {n3} px d encre, {c3} colonnes touchees')
print(f'  => survie de l encre du titre au 1920 : {100*n3/n2:.1f} % du 2400 ; colonnes {100*c3/c2:.1f} %')
