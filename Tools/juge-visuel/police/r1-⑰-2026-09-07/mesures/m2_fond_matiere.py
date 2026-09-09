# -*- coding: utf-8 -*-
"""m2 — le FOND : la zone de contenu est-elle une matière (dégradé/grain/vignette) ou un aplat ?
Contrôle positif : le fond du canon série 2 DOIT varier (vignette + grain) -> l'instrument discrimine.
Contrôle négatif attendu : si la capture varie aussi, l'écart n'existe pas."""
import commun as C

print('== m2 : matiere du fond ==')
cap = C.ouvrir('capture'); can = C.ouvrir('canon2'); vid = C.ouvrir('vide2'); ref = C.ouvrir('reference')

def sonde(im, nom, zone, pas=17):
    """statistiques du fond dans une zone sans encre : min/max/etendue par canal + teinte."""
    px = im.load(); x0,y0,x1,y1 = zone
    vals = []
    for y in range(y0, y1, pas):
        for x in range(x0, x1, pas):
            vals.append(px[x, y])
    r = [v[0] for v in vals]; g = [v[1] for v in vals]; b = [v[2] for v in vals]
    med = (sorted(r)[len(r)//2], sorted(g)[len(g)//2], sorted(b)[len(b)//2])
    print('  %-28s zone=%s n=%d' % (nom, zone, len(vals)))
    print('     mediane %s   R %d..%d (etendue %d)  G %d..%d (%d)  B %d..%d (%d)'
          % (C.hx(med), min(r),max(r),max(r)-min(r), min(g),max(g),max(g)-min(g), min(b),max(b),max(b)-min(b)))
    print('     ecart B-R sur la mediane = %+d  (bleu nuit si > 0)' % (med[2]-med[0]))
    return med, max(r)-min(r), max(b)-min(b)

print('\n-- CAPTURE : zone de contenu vide, sous les rangees, au-dessus du dock --')
sonde(cap, 'capture / grand vide', (40, 1200, 1040, 2000))
print('\n-- CAPTURE : bande de contenu entre les cartes --')
sonde(cap, 'capture / entre cartes', (60, 595, 1020, 615), pas=5)
print('\n-- CAPTURE : chrome (sous le dock) et bandeau --')
sonde(cap, 'capture / sous le dock', (40, 2360, 1040, 2398), pas=7)
sonde(cap, 'capture / bandeau gauche', (20, 20, 130, 130), pas=5)

print('\n-- CONTRÔLE POSITIF : le canon serie 2 a une matiere (doit VARIER) --')
sonde(can, 'canon2 / fond hors cartes', (20, 250, 880, 1740))
sonde(vid, 'vide2 / grand vide', (60, 300, 840, 880))

print('\n-- CONTRÔLE : la reference serie 6 (papier + art) --')
sonde(ref, 'reference / art du haut', (20, 200, 1060, 360))
