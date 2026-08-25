# -*- coding: utf-8 -*-
"""Medaillon: centre/diametre du boitier laiton, arcs (angle+couleur), aiguille (angle)."""
import math
from lib import *
D='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ecran-principal/r1-2026-08-25/'
def est_or(c):
    r,g,b=c; return r>110 and r-b>45 and g>75

def anneau(im, cx_guess, ytop, ybot, tag):
    """bords gauche/droit du cercle laiton sur plusieurs y -> centre + rayon"""
    px=im.load()
    pts=[]
    for y in range(ytop, ybot):
        xs=[x for x in range(cx_guess-140, cx_guess+140) if est_or(px[x,y])]
        if len(xs)>=2:
            # groupes
            grp=[]
            for x in xs:
                if grp and x==grp[-1][-1]+1: grp[-1].append(x)
                else: grp.append([x])
            if len(grp)>=2:
                pts.append((y, grp[0][0], grp[-1][-1]))
    if not pts: print(f"[{tag}] rien"); return None
    # le diametre max
    best=max(pts, key=lambda p: p[2]-p[1])
    cx=(best[1]+best[2])/2.0; d=best[2]-best[1]+1
    print(f"[{tag}] ligne la plus large: y={best[0]} x {best[1]}..{best[2]}  diam={d}  cx={cx:.1f}")
    ys=[p[0] for p in pts]
    print(f"      etendue verticale des lignes a 2+ groupes: y {min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})")
    cy=(min(ys)+max(ys))/2.0
    return cx, cy, d, min(ys), max(ys)

def polaire(im, cx, cy, r, tag, pas=2):
    px=im.load()
    print(f"[{tag}] scan polaire r={r:.1f} autour de ({cx:.1f},{cy:.1f}) — angle 0=haut, +=horaire")
    seq=[]
    for a in range(-100, 101, pas):
        rad=math.radians(a)
        x=cx + r*math.sin(rad); y=cy - r*math.cos(rad)
        c=px[int(round(x)), int(round(y))]
        seq.append((a,c))
    # classifier
    def cls(c):
        r_,g_,b_=c
        if g_>r_+18 and g_>b_-5 and g_>70: return 'T'   # teal
        if r_>g_+30 and r_>b_+25 and r_>90: return 'R'  # rouge
        if max(c)-min(c)<28 and sum(c)/3>55: return 'g' # gris clair (track)
        return '.'
    s=''.join(cls(c) for a,c in seq)
    print("      angles -100..+100 pas 2 :")
    print("      "+s)
    # bornes des segments
    cur=None; deb=None
    for i,(a,c) in enumerate(seq):
        k=cls(c)
        if k!=cur:
            if cur in ('T','R','g') and deb is not None:
                print(f"        {cur} : {deb}deg .. {seq[i-1][0]}deg  (largeur {seq[i-1][0]-deb+2}deg)")
            cur=k; deb=a
    if cur in ('T','R','g'): print(f"        {cur} : {deb}deg .. {seq[-1][0]}deg")
    return seq

K=ouvrir(D+'ecran-canon.png'); C=ouvrir(D+'capture-1080x1920.png')
print("\n===== CANON =====")
rk=anneau(K, 588, 15, 230, 'canon anneau')
print("\n===== CAPTURE 1080x1920 =====")
rc=anneau(C, 540, 10, 200, 'c19 anneau')
