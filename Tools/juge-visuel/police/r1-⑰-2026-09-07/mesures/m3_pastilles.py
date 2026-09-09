# -*- coding: utf-8 -*-
"""m3 — les 'pastilles' rouges des deux cartes : combien, quelle taille, et CONTIENNENT-ELLES DE L'ENCRE ?
Contrôle positif : la même sonde, appliquée aux jetons du canon série 2 (qui PORTENT un libellé),
doit trouver de l'encre à l'intérieur. Contrôle négatif : elle ne doit rien trouver dans un aplat de fond."""
import commun as C

print('== m3 : pastilles / jetons ==')
cap = C.ouvrir('capture'); can = C.ouvrir('canon2')
px = cap.load()

def rouges(im, y0, y1, x0=0, x1=None):
    """colonnes contenant des pixels 'rouge vif' (R>110, R-G>50, R-B>50)"""
    p = im.load(); W,H = im.size
    x1 = x1 or W
    cols = []
    for x in range(x0, x1):
        n = 0
        for y in range(y0, y1):
            r,g,b = p[x,y]
            if r > 110 and r-g > 50 and r-b > 50:
                n += 1
        cols.append((x,n))
    return cols

def groupes(cols, seuil=1):
    out=[]; dedans=False
    for x,n in cols:
        if n >= seuil and not dedans: dedans=True; d=x
        elif n < seuil and dedans: dedans=False; out.append((d, x-1, x-d))
    if dedans: out.append((d, cols[-1][0], cols[-1][0]-d+1))
    return out

for nom, (y0,y1) in [('carte 1 (CE QU\'ILS CROIENT)', (515, 560)), ('carte 2 (LA PATROUILLE)', (790, 830))]:
    print('\n-- %s : bande y=%d..%d --' % (nom, y0, y1))
    g = groupes(rouges(cap, y0, y1), 2)
    print('   %d groupes rouges horizontaux :' % len(g))
    for d,f,w in g:
        print('     x %4d..%4d  largeur %3d px' % (d,f,w))
    if g:
        # bbox verticale du premier groupe
        d,f,w = g[0]
        bb,n = C.bbox_encre(cap, d-2, y0-15, f+3, y1+15, 60, 'clair')
        print('   bbox encre du 1er jeton : %s (n=%d px)' % (str(bb), n))
        # INTERIEUR : y milieu, x de d+8 a f-8 -> y a-t-il de l'encre CLAIRE (texte) ?
        for d,f,w in g:
            xi0, xi1 = d+7, f-6
            cy0, cy1 = bb[1]+3, bb[3]-2
            sub,n2 = C.bbox_encre(cap, xi0, cy0, xi1, cy1, 70, 'clair')
            med = C.mediane_fenetre(cap, (d+f)//2, (bb[1]+bb[3])//2, 3)
            print('     jeton x%4d..%4d : encre INTERIEURE (L>70) = %4d px   mediane interieure %s'
                  % (d, f, n2, C.hx(med)))

print('\n-- CONTRÔLE POSITIF : jetons du canon serie 2 (ils portent un libelle) --')
# jetons "CONVICTION · EN CHASSE x4" etc. vers y=500-560 du canon 900x1752
g = groupes(rouges(can, 495, 555), 2)
print('   groupes rouges y=495..555 :', g[:6])
if g:
    d,f,w = g[0]
    bb,n = C.bbox_encre(can, d, 490, f, 560, 60, 'clair')
    print('   bbox du jeton rouge : %s' % str(bb))
    sub,n2 = C.bbox_encre(can, bb[0]+10, bb[1]+5, bb[2]-10, bb[3]-4, 70, 'clair')
    print('   encre INTERIEURE (L>70) = %d px  -> la sonde TROUVE du texte : %s' % (n2, n2 > 200))

print('\n-- CONTRÔLE NEGATIF : la meme sonde sur un aplat de fond de la capture --')
sub,n3 = C.bbox_encre(cap, 200, 1400, 700, 1500, 70, 'clair')
print('   encre trouvee dans le vide = %d px (attendu 0)' % n3)
