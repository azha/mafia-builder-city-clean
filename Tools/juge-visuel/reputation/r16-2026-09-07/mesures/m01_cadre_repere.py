# m01 : reperes du cadre (rails or), chrome (bandeau/dock), echelle.
# Controle positif : largeur des 3 images = 1080 px (echelle x3,6 declaree par le dossier).
import sys; sys.path.insert(0,'.')
from lib import *

def lignes_or(im, xmin=0, xmax=None, seuil=200):
    """rangees dont le compte de px or depasse seuil"""
    px = im.load(); W,H = im.size
    xmax = xmax or W
    out=[]
    for y in range(H):
        n = sum(1 for x in range(xmin,xmax) if est_or(px[x,y]))
        if n >= seuil: out.append((y,n))
    return out

def colonnes_or(im, ymin, ymax, seuil=200):
    px = im.load(); W,H = im.size
    out=[]
    for x in range(W):
        n = sum(1 for y in range(ymin,ymax) if est_or(px[x,y]))
        if n >= seuil: out.append((x,n))
    return out

def groupes(idx, tol=2):
    g=[]; 
    for v in idx:
        if g and v - g[-1][-1] <= tol: g[-1].append(v)
        else: g.append([v])
    return g

for nom in ['reference-1080x2102.png','capture-1080x2400.png','capture-1080x1920.png']:
    im = ouvrir(nom); W,H = im.size
    print("  CONTROLE POSITIF largeur =", W, "(attendu 1080)")
    ly = lignes_or(im, seuil=400)
    print("  rangees a >=400 px d'or :", groupes([y for y,_ in ly]) and [ (g[0],g[-1]) for g in groupes([y for y,_ in ly]) ])
    # colonnes d'or verticales sur la hauteur du cadre approx
    print()
