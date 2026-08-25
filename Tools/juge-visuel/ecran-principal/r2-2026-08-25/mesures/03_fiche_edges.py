# -*- coding: utf-8 -*-
"""Bords gauche/droite de la fiche par ECART-TYPE de colonne : l'interieur de la
fiche est un aplat tres sombre (variance faible), l'art autour ne l'est pas.
Controle positif : la largeur du canon doit retomber sur 366 CSS (mesure navigateur)."""
import sys, os, statistics
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

def col_stats(im, x, y0, y1):
    px = im.load(); v=[]
    for y in range(y0,y1,2):
        p = px[x,y]; v.append((p[0]+p[1]+p[2])/3.0)
    return statistics.mean(v), statistics.pstdev(v)

def edges(path, ytop, ybot, label):
    im = open_img(path); W,H = im.size; c = css(im)
    y0, y1 = ytop+int(0.12*(ybot-ytop)), ytop+int(0.30*(ybot-ytop))  # bande titre : aplat pur a gauche/droite
    prof = [(x,)+col_stats(im,x,y0,y1) for x in range(0,W)]
    # interieur = mean<70 et std<8
    inside = [x for x,m,s in prof if m<75 and s<9]
    print(f"    {label}: bande y[{y0},{y1}]  x interieur: min={min(inside)} max={max(inside)} n={len(inside)}")
    # bord gauche = premier x de la plus longue plage continue
    runs=[]; cur=[inside[0]]
    for x in inside[1:]:
        if x==cur[-1]+1: cur.append(x)
        else: runs.append(cur); cur=[x]
    runs.append(cur)
    runs.sort(key=len, reverse=True)
    r=runs[0]
    print(f"    {label}: plage principale x=[{r[0]},{r[-1]}] w={r[-1]-r[0]+1}px -> CSS x={r[0]/c:.2f} w={(r[-1]-r[0]+1)/c:.2f}")
    return r[0], r[-1], c

print("=== CANON (attendu CSS x=13 w=366) ===")
edges(CANON, 1283, 1776, 'canon')
print("=== CAP 1920 ===")
edges(CAP16, 1175, 1638, 'cap16')
print("=== CAP 2400 : fenetre plus large pour trouver la fiche ===")
im = open_img(CAP24); W,H=im.size; c=css(im)
px = im.load()
def dark_frac(y):
    n=0
    for x in range(int(W*0.10), int(W*0.90)):
        p=px[x,y]
        if sum(p)/3.0 < 70: n+=1
    return n/float(int(W*0.90)-int(W*0.10))
tops=[y for y in range(1500,2400) if dark_frac(y)>0.85]
print("    cap24 fiche rows dark>0.85 :", tops[0], "->", tops[-1], f" h={tops[-1]-tops[0]+1}px CSS h={(tops[-1]-tops[0]+1)/c:.2f} top CSS={tops[0]/c:.2f}")
edges(CAP24, tops[0], tops[-1], 'cap24')
