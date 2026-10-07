# -*- coding: utf-8 -*-
"""La planche `_bas` montre-t-elle VRAIMENT un autre état de défilement ?
`journal.tsv` annonce « le contenu DÉBORDE — planche _bas prise » pour ㉝, ㉓ et ㊵. Une planche
`_bas` identique au bit près à la planche haute prouve que RIEN n'a défilé — donc que l'annonce
du journal est fausse pour cet écran / cette résolution, et qu'il n'y a pas de bas à juger."""
from PIL import Image, ImageChops
CAP='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/planches-par-ecran-2026-10-07/'
PAIRES=[('E06_Dmolition_1080x2400.png','E06_Dmolition_bas_1080x2400.png'),
        ('E06_Dmolition_1080x1920.png','E06_Dmolition_bas_1080x1920.png'),
        ('E07_Boutique_1080x2400.png','E07_Boutique_bas_1080x2400.png'),
        ('E07_Boutique_1080x1920.png','E07_Boutique_bas_1080x1920.png'),
        ('E10_Filire_1080x2400.png','E10_Filire_bas_1080x2400.png'),
        ('E10_Filire_1080x1920.png','E10_Filire_bas_1080x1920.png')]
for a,b in PAIRES:
    A=Image.open(CAP+a).convert('RGB'); B=Image.open(CAP+b).convert('RGB')
    print('   ouvre %-38s %dx%d   et %-38s %dx%d' % (a,A.size[0],A.size[1],b,B.size[0],B.size[1]))
    d=ImageChops.difference(A,B).convert('L'); h=d.histogram(); tot=sum(h)
    moy=sum(v*c for v,c in enumerate(h))/tot; frac=100.0*sum(h[8:])/tot
    verdict = 'IDENTIQUES → rien n a défilé' if moy==0 else 'différentes → la liste a bien défilé'
    print('      diff moyenne %7.3f   px>8 %6.2f %%   → %s' % (moy, frac, verdict))
