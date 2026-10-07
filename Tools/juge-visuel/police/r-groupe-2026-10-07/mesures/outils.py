# -*- coding: utf-8 -*-
"""Boîte à outils du juge ⊥ — chaque fonction est pure, chaque script qui l'importe
IMPRIME la taille des images qu'il ouvre (c'est la preuve qu'il a lu les bons fichiers)."""
from PIL import Image

def ouvrir(p):
    im = Image.open(p).convert('RGB')
    print('   ouvre %-96s %dx%d' % (p.split('/')[-1], im.size[0], im.size[1]))
    return im

def mediane_fenetre(im, x0, y0, x1, y1):
    """Médiane par canal d'une fenêtre — jamais un pixel seul (frange d'anticrénelage)."""
    px = im.load(); R=[];G=[];B=[]
    for y in range(y0, y1):
        for x in range(x0, x1):
            r,g,b = px[x,y]; R.append(r);G.append(g);B.append(b)
    f = lambda L: sorted(L)[len(L)//2]
    return (f(R), f(G), f(B))

def lum(c):
    """Luminance relative sRGB (WCAG)."""
    def c1(v):
        v = v/255.0
        return v/12.92 if v <= 0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*c1(c[0]) + 0.7152*c1(c[1]) + 0.0722*c1(c[2])

def contraste(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la,lb), min(la,lb)
    return (hi+0.05)/(lo+0.05)

def profil_lignes(im, y0, y1, x0=0, x1=None):
    """Pour chaque ligne : (luminance moyenne 0-255, écart max-min) — sert à trouver
    les bandes PLATES (écart ~0) et les bandes TEXTURÉES / à encre."""
    x1 = x1 or im.size[0]
    g = im.convert('L'); px = g.load(); out=[]
    for y in range(y0, y1):
        vals = [px[x,y] for x in range(x0, x1, 2)]
        out.append((y, sum(vals)/len(vals), max(vals)-min(vals)))
    return out

def encre(im, y0, y1, x0=0, x1=None, fond=None, seuil=18):
    """% de pixels qui s'écartent du fond dominant de la bande — mesure d'OCCUPATION."""
    x1 = x1 or im.size[0]
    g = im.convert('L'); px = g.load()
    if fond is None:
        h = {}
        for y in range(y0, y1, 2):
            for x in range(x0, x1, 2):
                h[px[x,y]] = h.get(px[x,y],0)+1
        fond = max(h.items(), key=lambda kv: kv[1])[0]
    n=0; tot=0
    for y in range(y0, y1):
        for x in range(x0, x1):
            tot += 1
            if abs(px[x,y]-fond) > seuil: n += 1
    return 100.0*n/tot, fond

def palette(im, k=6):
    q = im.resize((135, im.size[1]//8)).quantize(colors=k, method=Image.MEDIANCUT).convert('RGB')
    cols = q.getcolors(10**6); tot = sum(c for c,_ in cols)
    return [(round(100.0*c/tot,1), rgb) for c,rgb in sorted(cols, reverse=True)]

def compter_teinte(im, x0,y0,x1,y1, test):
    """Compte les pixels d'une fenêtre qui satisfont `test(r,g,b)`."""
    px = im.load(); n=0; tot=0
    for y in range(y0,y1):
        for x in range(x0,x1):
            tot+=1
            if test(*px[x,y]): n+=1
    return n, tot

OR   = lambda r,g,b: r>130 and g>95 and b<110 and r-b>60 and abs(r-g)<80   # famille or/laiton
CREME= lambda r,g,b: r>190 and g>190 and b>165                             # papier crème

def couleur_texte(im, box, part=0.04):
    """Couleur de l'ENCRE d'un texte : médiane des pixels les plus CLAIRS de la boîte
    (les 4 % du haut), à l'écart de la frange d'anticrénelage par construction (on prend
    le cœur du glyphe). Une médiane de fenêtre rendrait le FOND sur un texte fin."""
    x0,y0,x1,y1 = box; px=im.load(); L=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; L.append((lum(c), c))
    L.sort(key=lambda t:t[0]); n=max(1,int(len(L)*part))
    sel=[c for _,c in L[-n:]]
    f=lambda i: sorted(s[i] for s in sel)[len(sel)//2]
    return (f(0),f(1),f(2))

def couleur_fond(im, box, part=0.30):
    """Couleur du FOND d'une boîte de texte : médiane des 30 % les plus SOMBRES."""
    x0,y0,x1,y1 = box; px=im.load(); L=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; L.append((lum(c), c))
    L.sort(key=lambda t:t[0]); n=max(1,int(len(L)*part))
    sel=[c for _,c in L[:n]]
    f=lambda i: sorted(s[i] for s in sel)[len(sel)//2]
    return (f(0),f(1),f(2))
