# -*- coding: utf-8 -*-
"""m01 — repères horizontaux/verticaux : où sont les filets OR (#b08d3e / #f2c96b)
et les frontières de blocs, sur la référence et sur la capture.
Contrôle positif : la largeur de l'image (1080 des deux côtés) et le jeton or_filet
recopié de chassis6.py T['or_filet'] = #b08d3e.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REF = os.path.join(D, 'reference-1080x2102.png')
CAP = os.path.join(D, 'capture-1080x2400.png')

OR_FILET = (0xb0, 0x8d, 0x3e)
OR_VIF   = (0xf2, 0xc9, 0x6b)

def prox(p, q, tol):
    return abs(p[0]-q[0])<=tol and abs(p[1]-q[1])<=tol and abs(p[2]-q[2])<=tol

def profil_or(path, nom, tol=40):
    im = Image.open(path).convert('RGB')
    W,H = im.size
    print('%s : %s  %dx%d' % (nom, os.path.basename(path), W, H))
    px = im.load()
    lignes = []
    for y in range(H):
        n = 0
        for x in range(0, W, 2):
            c = px[x,y]
            if prox(c, OR_FILET, tol) or prox(c, OR_VIF, tol):
                n += 1
        lignes.append(n*2)
    # lignes "filet horizontal" : >40% de la largeur en or
    seuil = int(W*0.40)
    runs = []
    y = 0
    while y < H:
        if lignes[y] >= seuil:
            y0 = y
            while y < H and lignes[y] >= seuil: y += 1
            runs.append((y0, y-1, max(lignes[y0:y])))
        else:
            y += 1
    print('  filets horizontaux (>=40%% de W en or, tol=%d) :' % tol)
    for a,b,m in runs:
        print('    y=%4d..%4d  (h=%d)  max=%d px' % (a,b,b-a+1,m))
    return im, lignes

for nom, p in (('REF', REF), ('CAP', CAP)):
    profil_or(p, nom)
    print()
