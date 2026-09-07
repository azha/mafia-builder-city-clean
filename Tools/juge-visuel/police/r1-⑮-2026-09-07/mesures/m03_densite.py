# -*- coding: utf-8 -*-
"""m03 — densite d'encre et occupation verticale, capture vs canons de serie 2.
Seuil ADAPTATIF : mediane du fond + 22. Le seuil et la mediane sont imprimes (declaration de regime).
Contrôle positif : sur le canon VIDE, la bande du message (y 880..1100 @900px) doit rendre de l'encre.
Contrôle negatif : sur le canon VIDE, la bande y 300..800 doit rendre ~0 (grand vide voulu).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def ouvrir(rel):
    p = os.path.join(D, rel); im = Image.open(p).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

def mediane(vals):
    v = sorted(vals); n = len(v)
    return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])/2.0

def analyse(nom, im, y0, y1):
    g = im.convert('L'); w, h = g.size; px = g.load()
    ech = [px[x, y] for y in range(y0, y1, 7) for x in range(0, w, 7)]
    med = mediane(ech); seuil = med + 22
    lignes = []
    for y in range(y0, y1):
        c = 0
        for x in range(w):
            if px[x, y] > seuil: c += 1
        lignes.append(c)
    tot = sum(lignes); aire = (y1-y0)*w
    nb_vides = sum(1 for c in lignes if c == 0)
    print("-- %-22s zone y=%d..%d  mediane fond=%.1f seuil=%.1f" % (nom, y0, y1, med, seuil))
    print("   densite d'encre = %.2f %% de l'aire ; lignes SANS encre = %d / %d = %.1f %%"
          % (100.0*tot/aire, nb_vides, y1-y0, 100.0*nb_vides/(y1-y0)))
    # plus grand vide contigu
    best = (0, 0, 0); cur = None
    for i, c in enumerate(lignes):
        if c == 0:
            if cur is None: cur = i
        else:
            if cur is not None:
                if i-cur > best[0]: best = (i-cur, y0+cur, y0+i-1)
                cur = None
    if cur is not None and len(lignes)-cur > best[0]: best = (len(lignes)-cur, y0+cur, y0+len(lignes)-1)
    print("   plus grand vide contigu = %d px  (y %d..%d) = %.1f %% de la zone"
          % (best[0], best[1], best[2], 100.0*best[0]/(y1-y0)))
    return lignes

cap = ouvrir('capture-1080x2400.png')
can = ouvrir('etats/inspections-canon.png')
vid = ouvrir('etats/inspections-vide.png')
print()
# capture : zone de CONTENU entre le bas du bandeau (143) et le haut du dock (2210)
analyse('capture CONTENU', cap, 143, 2210)
# canons serie 2 : ecran entier (pas de chrome de shell), sous le filet de tete (y=230)
analyse('canon garni CORPS', can, 231, 1745)
analyse('canon vide  CORPS', vid, 231, 1745)
print()
g = vid.convert('L'); px = g.load()
c1 = sum(1 for y in range(880, 1100) for x in range(900) if px[x, y] > 38)
c2 = sum(1 for y in range(300, 800) for x in range(900) if px[x, y] > 38)
print("CONTROLE POSITIF canon vide, bande du message y880..1100 -> %d px d'encre (attendu >0)" % c1)
print("CONTROLE NEGATIF canon vide, bande y300..800           -> %d px d'encre (attendu ~0)" % c2)
