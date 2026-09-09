#!/usr/bin/env python3
"""m11 - contraste WCAG du titre survivant au 1080x1920, et largeur du titre
recouverte par le medaillon OPAQUE.
Le glyphe est identifie au 2400 (encre = (242,201,106) a +-12) puis LU au meme
endroit -480 dans le 1920. Trois classes : intact (ecart <=12), assombri
(teinte doree conservee r>g>b), remplace (teinte non doree = chrome opaque).
Controle positif : au 2400 la classe 'intact' doit valoir 100 %.
"""
from PIL import Image
import os, statistics
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lin(c):
    c/=255.0
    return c/12.92 if c<=0.03928 else ((c+0.055)/1.055)**2.4
def L(p): return 0.2126*lin(p[0])+0.7152*lin(p[1])+0.0722*lin(p[2])
def contraste(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
a=Image.open(os.path.join(D,'capture-1080x1920.png')).convert('RGB'); pa=a.load()
b=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB'); pb=b.load()
print('tailles', a.size, b.size)
CIB=(242,201,106)
glyphes=[(x,y) for y in range(544,594) for x in range(320,780)
         if max(abs(pb[x,y][i]-CIB[i]) for i in range(3))<=12]
print('  px de glyphe du titre reperes au 2400 :', len(glyphes))
intact=somb=rempl=0; sombres=[]
cols_rempl=set(); cols_tot=set()
for x,y in glyphes:
    p=pa[x,y-480]; cols_tot.add(x)
    if max(abs(p[i]-CIB[i]) for i in range(3))<=12: intact+=1
    elif p[0]>p[1]>p[2]: somb+=1; sombres.append(p)
    else: rempl+=1; cols_rempl.add(x)
print(f'  au 1920 : intact {intact} ({100*intact/len(glyphes):.1f} %) · '
      f'assombri {somb} ({100*somb/len(glyphes):.1f} %) · '
      f'remplace par du chrome {rempl} ({100*rempl/len(glyphes):.1f} %)')
med=tuple(int(statistics.median([s[i] for s in sombres])) for i in range(3))
fond1920=pa[320,88]; fond2400=pb[320,568]
print(f'  encre assombrie mediane {med} sur fond {fond1920} -> contraste {contraste(med,fond1920):.2f}')
print(f'  encre nominale  {CIB} sur fond {fond2400} -> contraste {contraste(CIB,fond2400):.2f}')
print(f'  colonnes du titre totalement remplacees : {len(cols_rempl)} sur {len(cols_tot)} '
      f'({100*len(cols_rempl)/len(cols_tot):.0f} %), de x={min(cols_rempl)} a x={max(cols_rempl)}')
