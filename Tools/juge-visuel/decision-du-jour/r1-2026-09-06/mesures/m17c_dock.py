#!/usr/bin/env python3
"""m17c - DOCK, mesure simple et robuste (les deux jets precedents ont ete refutes par leur propre
controle : detection de disques instable). Ici : dans la BANDE des pastilles (au-dessus des
libelles), on compte les px de GLYPHE BLANC (une icone d'onglet est blanche et opaque dans le canon).
Controle positif : le canon rend une aire de glyphe >> 0 ; controle negatif : la bande des LIBELLES
(texte or, pas blanc) doit rendre peu de px blancs des deux cotes.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANON='/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran-principal/ecran-canon.png'
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap = Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
can = Image.open(CANON).convert('RGB')
print(f"[CAP] {cap.size}  [CANON] {can.size}")
def blanc(p): return L(p)>170 and max(p)-min(p)<45   # neutre et clair = glyphe d'icone

def compte(im,x0,x1,y0,y1,label):
    px=im.load(); n=0; tot=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            tot+=1
            if blanc(px[x,y]): n+=1
    print(f"[{label}] bande x={x0}..{x1} y={y0}..{y1} : {n} px de glyphe blanc / {tot} = {n/tot*100:.3f}%")
    return n

print("\n-- bande des PASTILLES (les 4 disques d'onglet) --")
a=compte(can,150,1050,1875,1965,'CANON pastilles')
b=compte(cap,120,1000,2190,2290,'CAP pastilles')
print(f"  CONTROLE POSITIF canon>0 : {a} px -> {'OK' if a>500 else 'ECHEC'}")
print(f"  CAPTURE : {b} px  -> {'AUCUNE icone' if b<50 else 'icones presentes'}")

print("\n-- CONTROLE NEGATIF : bande des LIBELLES (texte or, pas blanc) --")
c=compte(can,150,1050,1995,2035,'CANON libelles')
d=compte(cap,120,1000,2320,2360,'CAP libelles')
print(f"  attendu faible des deux cotes -> canon={c} cap={d}")
