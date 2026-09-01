# -*- coding: utf-8 -*-
"""13 — POLARITÉ DES QUATRE VOYANTS (É2 du générateur : un lieutenant VIERGE n'allume RIEN).
Éteint : pastille `lisere` #2a3648, bord de tuile `lisere`, fond `carte`.
Allumé : pastille `or_vif` #f2c96b + halo, bord `or_filet`, fond `carte2`.
Contrôle positif : les 4 pastilles de la RÉFÉRENCE (état vierge ratifié) doivent toutes sortir
`lisere`. Contrôle négatif : la même sonde appliquée au titre doré doit rendre `or_vif` — sinon
elle ne sait pas distinguer un voyant éteint d'un voyant allumé."""
from PIL import Image
JET={'lisere':(42,54,72),'or_vif':(242,201,107),'or_filet':(176,141,62),'carte':(17,24,35),'carte2':(22,25,27)}
def nom(p):
    b,d=None,1e9
    for n,c in JET.items():
        s=sum(abs(a-q) for a,q in zip(p,c))
        if s<d: b,d=n,s
    return '%s (d=%d)'%(b,d)
def med(im,x0,y0,x1,y1):
    px=im.load(); ps=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    return tuple(sorted(p[i] for p in ps)[len(ps)//2] for i in range(3))
R=Image.open('/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png').convert('RGB')
C=Image.open('/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png').convert('RGB')
print('m-120.png',R.size,'| screen_b3_reputation_1080x1920.png',C.size)
# tuiles : REF hauts 834,931,1028,1125 (h=85) ; CAP 534,641,749,856 (h=93)
for lib,im,tops,h,xdot,xbg,xb in (('REF',R,[834,931,1028,1125],85,489,700,455),
                                  ('CAP',C,[534,641,749,856],93,573,850,537)):
    print(' %s :'%lib)
    for i,t in enumerate(tops):
        c=t+h//2
        print('   voyant %d : pastille %-22s fond tuile %-22s bord gauche %s'
              %(i+1,nom(med(im,xdot-4,c-4,xdot+4,c+4)),nom(med(im,xbg-15,c-8,xbg+15,c+8)),
                nom(med(im,xb-1,c-6,xb+2,c+6))))
print(' contrôle négatif (sonde sur le titre doré) :',
      nom(med(R,280,435,290,455)), nom(med(C,340,95,352,115)))
