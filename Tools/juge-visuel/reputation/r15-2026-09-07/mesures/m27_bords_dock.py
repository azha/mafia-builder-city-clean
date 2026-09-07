"""m27 — rien de coupe aux 4 bords ; position du dock et gouttiere.
Controle positif : la rangee du filet du bandeau (y141) doit etre detectee comme "encre".
Controle negatif : la rangee 0 doit etre sans encre.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from common import *
for nom in ('capture-1080x2400.png','capture-1080x1920.png'):
    im=ouvrir(nom); p=im.load(); W,H=im.size
    for lab,pts in (('rangee 0',[(x,0) for x in range(W)]),
                    ('rangee H-1',[(x,H-1) for x in range(W)]),
                    ('colonne 0',[(0,y) for y in range(H)]),
                    ('colonne W-1',[(W-1,y) for y in range(H)]),
                    ('[ctrl+] rangee 141',[(x,141) for x in range(W)])):
        n=sum(1 for x,y in pts if lum(p[x,y])>45)
        print(f"  [{nom}] {lab} : {n} px de luminance > 45")
    # dock : premier objet sous le cadre
    rows=[(y,sum(1 for x in range(0,W) if lum(p[x,y])>24)) for y in range(H-500,H)]
    b=bandes(rows,60)
    print(f"    blocs sous le cadre (L>24) : {[(a,c) for a,c,_ in b][:6]}")
