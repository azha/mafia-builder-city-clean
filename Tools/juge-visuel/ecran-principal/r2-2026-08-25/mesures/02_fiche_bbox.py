# -*- coding: utf-8 -*-
"""BBox de la FICHE : detectee par sa colonne de bord gauche (panneau tres sombre
sur art clair) puis affinee. Sortie en px image ET en px CSS."""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def dark_frac(im, y, x0, x1, thr=70):
    px = im.load(); n=0
    for x in range(x0,x1):
        p = px[x,y]
        if (p[0]+p[1]+p[2])/3.0 < thr: n+=1
    return n/float(x1-x0)

def find_fiche(path, ylo_frac, yhi_frac):
    im = open_img(path); W,H = im.size; c = css(im)
    x0,x1 = int(W*0.06), int(W*0.94)
    rows=[]
    for y in range(int(H*ylo_frac), int(H*yhi_frac)):
        rows.append((y, dark_frac(im,y,x0,x1)))
    # haut : 1er y ou frac>0.85 pendant 5 lignes
    top=None
    for i in range(len(rows)-5):
        if all(rows[i+k][1]>0.85 for k in range(5)): top=rows[i][0]; break
    bot=None
    for i in range(len(rows)-1,5,-1):
        if all(rows[i-k][1]>0.85 for k in range(5)): bot=rows[i][0]; break
    print(f"    fiche : top={top} bot={bot}  h={bot-top+1}px  -> CSS top={top/c:.2f} h={(bot-top+1)/c:.2f}")
    # bords gauche/droite au milieu vertical de la fiche
    ymid = (top+bot)//2
    px = im.load()
    left=None
    for x in range(0, W//2):
        if (sum(px[x,ymid])/3.0) < 70: left=x; break
    right=None
    for x in range(W-1, W//2, -1):
        if (sum(px[x,ymid])/3.0) < 70: right=x; break
    print(f"    fiche : left={left} right={right} w={right-left+1}px -> CSS left={left/c:.2f} w={(right-left+1)/c:.2f}")
    return im, top, bot, left, right, c

print("=== CANON (fiche attendue CSS 13,424.52 366x169.19) ===")
find_fiche(CANON, 0.55, 0.85)
print("=== CAP 1080x1920 ===")
find_fiche(CAP16, 0.55, 0.90)
print("=== CAP 1080x2400 ===")
find_fiche(CAP24, 0.52, 0.80)
