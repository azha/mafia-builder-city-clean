# -*- coding: utf-8 -*-
"""Quel CADRE de l'atelier chaque PNG de référence commité est-il ?
Vérifié par le juge ⊥ lui-même (jamais sur la foi d'une table) : chaque cadre candidat est
re-rendu à l'identique (Tools/rendre-tel.py, échelle 3,6 → 1080×2102, atelier d84c6eb) et
confronté au PNG commité. Le cadre qui rend ~0 est l'original ; les autres rendent >1.
⛔ Motif de ce contrôle : ⑮ et ⑰ ont été jugés contre le cadre de l'autre (31↔32)."""
import os
from PIL import Image, ImageChops
REFS = '/tmp/claude-1000/-home-erutheone-project-mafia-clean-city/64b6f928-1e0e-49fc-9e29-b231486e059a/scratchpad/refs'
J = '/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel'
CAS = [('㉝ demolition','ecran_demolition/reference-1080x2102.png',[79,80,81,82,83,84],'s6'),
       ('㉓ boutique  ','compte/reference-㉓-1080x2102.png',[98,99,100],'s6'),
       ('⑮ police     ','police/reference-⑮-1080x2102.png',[31,32,33,34,35],'s6'),
       ('⑰ police     ','police/reference-⑰-1080x2102.png',[31,32,33,34,35],'s6'),
       ('㊵ filiere   ','screen_c2/reference-1080x2102.png',[137,138,139,140,141,142],'s6'),
       ('⑭ compression','compression/reference-1080x2102.png',[25,26,27,28,29,30],'s4')]
for nom, p, idxs, pfx in CAS:
    a = Image.open(os.path.join(J,p)).convert('RGB')
    print('%s  %s  %dx%d' % (nom, p, a.size[0], a.size[1]))
    for i in idxs:
        b = Image.open(os.path.join(REFS,'%s-%d.png'%(pfx,i))).convert('RGB')
        d = ImageChops.difference(a,b).convert('L'); h = d.histogram(); tot = sum(h)
        moy = sum(v*c for v,c in enumerate(h))/tot; frac = 100.0*sum(h[8:])/tot
        print('     vs cadre %-3d  diff moyenne %7.3f   px>8 : %6.2f %%  %s' % (i, moy, frac, '  <<< IDENTIQUE' if moy < 1.5 else ''))
