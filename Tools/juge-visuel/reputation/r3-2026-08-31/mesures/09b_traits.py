# -*- coding: utf-8 -*-
"""09b — LES CINQ TRAITS DU PORTRAIT, un par un, par composantes connexes.
Chaque trait est isolé par proximité à son jeton (L1<=30) PUIS par la plus grosse composante
connexe, ce qui élimine les pixels d'anti-crénelage éparpillés que la classe seule ramasse.
Longueurs en UNITÉS DU viewBox SVG (62x78 rendu sur 96 px CSS) : 4,645 px/u en réf, 5,574 en
capture. Origine du repère = coin haut-gauche du SVG dans chaque image.
Contrôle positif : la largeur du BUSTE est écrite dans le générateur (path 6->56 = 50 u) et doit
sortir à ~50 u des deux côtés.
Contrôle négatif : la même mesure sur la TÊTE doit sortir à ~25 u (ellipse rx=12,5) — si buste et
tête sortaient à la même largeur, la segmentation fusionnerait deux formes."""
from PIL import Image
JET={'creme':(234,224,200),'creme2':(185,173,146),'carte2':(22,25,27),'rang':(35,42,45),
     'fond':(11,16,22),'carte':(17,24,35)}
def cl(p,tol=30):
    b,d=None,1e9
    for n,c in JET.items():
        s=sum(abs(a-q) for a,q in zip(p,c))
        if s<d: b,d=n,s
    return b if d<=tol else None
def blob(px,jet,x0,y0,x1,y1):
    pts={(x,y) for y in range(y0,y1) for x in range(x0,x1) if cl(px[x,y])==jet}
    best=set()
    while pts:
        s=pts.pop(); comp={s}; pile=[s]
        while pile:
            x,y=pile.pop()
            for dx,dy in ((1,0),(-1,0),(0,1),(0,-1)):
                q=(x+dx,y+dy)
                if q in pts: pts.discard(q); comp.add(q); pile.append(q)
        if len(comp)>len(best): best=comp
    return best
def fiche(nom,comp,u,ox,oy):
    if not comp: print('   %-22s ABSENT'%nom); return
    a0=min(p[0] for p in comp); a1=max(p[0] for p in comp)
    b0=min(p[1] for p in comp); b1=max(p[1] for p in comp)
    w,h=(a1-a0+1),(b1-b0+1)
    print('   %-22s x %5.1f..%5.1f u  y %5.1f..%5.1f u | %5.1f x %5.1f u | aire %6.1f u2 | rempl %.3f'
          %(nom,(a0-ox)/u,(a1-ox)/u,(b0-oy)/u,(b1-oy)/u,w/u,h/u,len(comp)/u/u,len(comp)/(w*h)))
# SVG : origine et unité par image (svg de 96x119 px CSS, viewBox 62x78)
CAS=[('REF','/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r3-2026-08-31/reference/m-120.png',4.6452,102,815),
     ('CAP','/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png',5.5742,111,534)]
# trait : (jeton, fenetre en unites SVG x0,y0,x1,y1)
TR=[('tête (ellipse r12,5x15)','creme2',(15,14,47,48)),
    ('cou (rect 26..36 / 48..58)','creme2',(24,47,38,62)),
    ('cheveux (calotte)','carte2',(15,6,47,30)),
    ('buste (path 6..56)','carte2',(2,52,60,78)),
    ('col (triangle 24-38 / 56-70)','creme',(20,52,42,74)),
    ('gants (ellipse c12,75 r5x3,4)','rang',(4,68,22,78)),
    ('liseré/encre (stroke+yeux+bouche)','fond',(2,6,60,78))]
for nom,path,u,ox,oy in CAS:
    im=Image.open(path).convert('RGB'); px=im.load()
    print('='*92); print(nom,path.split('/')[-1],im.size,'| origine SVG (%d,%d) | 1 u = %.3f px'%(ox,oy,u))
    for lib,jet,(a,b,c,d) in TR:
        fiche(lib,blob(px,jet,ox+int(a*u),oy+int(b*u),ox+int(c*u),oy+int(d*u)),u,ox,oy)
