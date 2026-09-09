# m07 — LE HALO DES COMPTEURS : profil d'exces de luminance par distance de Chebyshev a l'encre.
#
# Isolement : ENCRE := |c - (127,212,217)| <= 30 (Chebyshev) ; la couleur nominale est la MEME des deux
#   cotes (0/255 d'ecart, m08).  Analyse bornee a l'INTERIEUR de la boite du compteur (bords mesures a
#   la ligne/colonne de gradient, imprimes) pour que le filet de la boite n'entre pas dans l'anneau ;
#   les px du LIBELLE creme (r > 80, hors encre) sont EXCLUS — sinon ils gonflent l'exces a d >= 23.
#   d(px) = distance de Chebyshev au px d'encre le plus proche (dilatations successives).
#   LIGNE DE BASE := mediane de luminance des px a d >= 30 restants dans la boite.
#   EXCES(d) := moyenne de luminance des px a distance EXACTEMENT d, moins la ligne de base.
# Luminance = 0,2126 R + 0,7152 G + 0,0722 B (non lineaire : les « + » sont des points de 0..255).
# Controle positif : le NOMBRE de px a chaque distance doit etre du meme ordre des deux cotes
#   (sinon la population, et non le halo, expliquerait l'ecart).
# Controle negatif : le meme profil autour du LIBELLE creme du meme compteur — la maquette n'y met
#   aucune lueur : l'exces doit y etre ~0 dans la REFERENCE.
import sys, os, math
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *

ENCRE=(127,212,217)

def profil(im, nom, bb, boite, dmax=30, test=None, etiq="encre", exclure_clair=True, dbase=30):
    p=px(im); X0,Y0,X1,Y1=boite
    if test is None: test=lambda c: dist(c,ENCRE)<=30
    encre={(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1) if test(p[x,y])}
    exclus=({(x,y) for y in range(Y0,Y1+1) for x in range(X0,X1+1)
            if (x,y) not in encre and p[x,y][0]>80} if exclure_clair else set())
    d={q:0 for q in encre}; front=set(encre)
    for k in range(1,dmax+31):
        nf=set()
        for (x,y) in front:
            for dx in (-1,0,1):
                for dy in (-1,0,1):
                    q=(x+dx,y+dy)
                    if q in d or q in exclus: continue
                    if not (X0<=q[0]<=X1 and Y0<=q[1]<=Y1): continue
                    d[q]=k; nf.add(q)
        front=nf
        if not front: break
    par={}
    for q,k in d.items():
        if k: par.setdefault(k,[]).append(lum(p[q]))
    loin=[v for k,vs in par.items() if k>=dbase for v in vs]; loin.sort()
    base=loin[len(loin)//2]
    print(f"\n  --- {nom} ({etiq}) : bbox {bb} ; boite {boite} ; base (d>={dbase}, n={len(loin)}) = {base:.2f}")
    res={k:(sum(par[k])/len(par[k])-base, len(par[k])) for k in sorted(par) if k<=dmax}
    ds=[k for k in range(2,dmax+1,2) if k in res]
    print("    d  : " + " ".join(f"{k:>6}" for k in ds))
    print("    +L : " + " ".join(f"{res[k][0]:+6.1f}" for k in ds))
    print("    n  : " + " ".join(f"{res[k][1]:>6}" for k in ds))
    loc=[p[q] for q,k in d.items() if 2<=k<=4]
    fl=tuple(sorted(c[i] for c in loc)[len(loc)//2] for i in range(3))
    print(f"    fond local (anneau d2..d4) = {fl} ; contraste de l'encre = {contraste(ENCRE,fl):.2f}:1")
    return res, fl

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
# boites des compteurs 1, mesurees au gradient (imprimees) :
BR=(54,706,358,812)   # REF  : bords (50..53 / 359..362) x (702..705 / 813..816)
BC=(50,731,356,837)   # JEU  : bords (46..49 / 357..361) x (727..730 / 838..842)
print("  boite REF interieure :",BR,"  boite JEU interieure :",BC)
R,flR=profil(ref,'REFERENCE compteur 1',(171,725,237,761),BR)
C,flC=profil(cap,'CAPTURE compteur 1',(173,749,234,785),BC)
ds=[k for k in range(2,31,2) if k in R and k in C]
print("\n  RAPPORT jeu/canon de l'exces, par distance :")
print("    d      : " + " ".join(f"{k:>6}" for k in ds))
print("    ref    : " + " ".join(f"{R[k][0]:+6.1f}" for k in ds))
print("    jeu    : " + " ".join(f"{C[k][0]:+6.1f}" for k in ds))
print("    jeu/ref: " + " ".join((f"{C[k][0]/R[k][0]:6.2f}" if abs(R[k][0])>0.3 else "     —") for k in ds))
# decomposition alpha / rayon : ajustement exponentiel A*exp(-d/lam) sur d2..d12
def ajuste(S):
    xs=[k for k in (2,4,6,8,10,12) if k in S and S[k][0]>0]
    n=len(xs); sx=sum(xs); sy=sum(math.log(S[k][0]) for k in xs)
    sxx=sum(k*k for k in xs); sxy=sum(k*math.log(S[k][0]) for k in xs)
    b=(n*sxy-sx*sy)/(n*sxx-sx*sx); a=(sy-b*sx)/n
    return math.exp(a), -1.0/b
Ar,lr=ajuste(R); Ac,lc=ajuste(C)
print(f"\n  ajustement A*exp(-d/lambda) sur d2..d12 :")
print(f"    REF : A = {Ar:.1f} pts, lambda = {lr:.2f} px")
print(f"    JEU : A = {Ac:.1f} pts, lambda = {lc:.2f} px")
print(f"    -> ALPHA (hauteur du pic) x{Ac/Ar:.2f}   ·   RAYON (portee) x{lc/lr:.2f}"
      f"   ·   lumiere totale ajoutee (A*lambda^2) x{(Ac/Ar)*(lc/lr)**2:.1f}")
# portee : derniere distance ou l'exces depasse +5 points
for nm,S in (('REF',R),('JEU',C)):
    dd=[k for k in sorted(S) if S[k][0]>5]
    print(f"    {nm} : dernier d ou l'exces depasse +5 pts = {max(dd) if dd else 0}")
print("\n  [CONTROLE NEGATIF] halo autour du LIBELLE creme du meme compteur, dans la REFERENCE :")
def creme(c): return dist(c,(138,151,156))<=25   # couleur du libelle, IDENTIQUE ref/jeu (m08)
profil(ref,'REFERENCE libelle','libelle creme',BR,dmax=10,test=creme,etiq="creme",exclure_clair=False,dbase=13)
print("  [CONTROLE NEGATIF bis] le meme libelle dans la CAPTURE :")
profil(cap,'CAPTURE libelle','libelle creme',BC,dmax=10,test=creme,etiq="creme",exclure_clair=False,dbase=13)
