# m03 — CADRES : bord du panneau (reference) et bord de la carte (capture).
# Methode : sur une ligne horizontale traversant le cadre, chercher les 2 premieres colonnes
# dont la luminance depasse le fond de plus de 12, en partant de chaque bord.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]

def scan_h(nom, y, seuil=12, fond=None):
    im = Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load(); w,h=im.size
    if fond is None: fond = lum(px[2,y])
    g=None; d=None
    for x in range(w):
        if lum(px[x,y])-fond > seuil: g=x; break
    for x in range(w-1,-1,-1):
        if lum(px[x,y])-fond > seuil: d=x; break
    return g,d,fond,px[g,y] if g is not None else None, px[d,y] if d is not None else None, im.size

def scan_v(nom, x, y0, y1, seuil=12):
    im = Image.open(os.path.join(D,nom)).convert('RGB'); px=im.load()
    fond = lum(px[x,y0])
    hh=None; bb=None
    for y in range(y0,y1):
        if lum(px[x,y])-fond > seuil: hh=y; break
    for y in range(y1-1,y0-1,-1):
        if lum(px[x,y])-fond > seuil: bb=y; break
    return hh,bb,fond

print('== REFERENCE : bord du panneau vnt6 (cerne or) ==')
for y in [700, 1200, 1700]:
    g,d,f,cg,cd,sz = scan_h('reference-1080x2102.png', y, 12)
    print(f'  y={y} taille={sz} fond_lum={f:.1f}  bord_gauche x={g} rgb={cg}  bord_droit x={d} rgb={cd}  largeur={d-g+1}')
hh,bb,f = scan_v('reference-1080x2102.png', 24, 400, 2102, 12)
print(f'  colonne x=24 : haut y={hh} bas y={bb} hauteur={bb-hh+1} (fond_lum={f:.1f})')

print()
print('== CAPTURE : bord de la carte ==')
for y in [400, 500, 600]:
    g,d,f,cg,cd,sz = scan_h('capture-1080x2400.png', y, 8)
    print(f'  y={y} taille={sz} fond_lum={f:.1f}  bord_gauche x={g} rgb={cg}  bord_droit x={d} rgb={cd}  largeur={d-g+1}')
hh,bb,f = scan_v('capture-1080x2400.png', 36, 320, 800, 8)
print(f'  colonne x=36 : haut y={hh} bas y={bb} hauteur={bb-hh+1} (fond_lum={f:.1f})')

print()
print('== CONTROLE POSITIF : la largeur du bandeau vaut 1080 des deux cotes ==')
for nom in ['reference-1080x2102.png','capture-1080x2400.png']:
    im=Image.open(os.path.join(D,nom)); print('  ',nom, im.size, '-> largeur', im.size[0])
print('== CONTROLE NEGATIF : sur une ligne VIDE de la capture (y=1500) aucun bord ne doit sortir ==')
g,d,f,cg,cd,sz = scan_h('capture-1080x2400.png', 1500, 8)
print(f'  y=1500 fond_lum={f:.1f} bord_gauche={g} bord_droit={d}  (attendu None/None ou trace faible)')
