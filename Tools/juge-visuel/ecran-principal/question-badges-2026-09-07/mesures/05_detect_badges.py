# Detecteur d'ANNEAU de badge par gabarit annulaire.
#  - masque anneau  : |c-(176,141,62)|_inf <= TOL
#  - masque "fond de disque" : pixel SOMBRE (max(r,g,b) <= DARK) -> l'interieur du badge est un disque noir
#  score(cx,cy) = fraction de l'anneau (6.0<=d<=7.2) couverte par le masque anneau
#  garde  : l'interieur (d<=4.5) doit etre SOMBRE a >= INNER_MIN (sinon c'est une ampoule/lampion)
# Controles positif (badge Laboratoire connu) et negatif (une ampoule de guirlande connue) imprimes.
from PIL import Image
import math, sys
SRC='../capture-nuit-1080x1920.png'
TOL=30; DARK=90; RMIN=6.0; RMAX=7.2; RIN=4.5
im=Image.open(SRC); W,H=im.size; px=im.load()
print(f'ouvre {SRC} : taille={im.size} mode={im.mode}')
ring=[[0]*W for _ in range(H)]
dark=[[0]*W for _ in range(H)]
for y in range(H):
    ry=ring[y]; dy_=dark[y]
    for x in range(W):
        r,g,b=px[x,y]
        if abs(r-176)<=TOL and abs(g-141)<=TOL and abs(b-62)<=TOL: ry[x]=1
        if max(r,g,b)<=DARK: dy_[x]=1
# offsets
ann=[]; inn=[]
for dy in range(-8,9):
    for dx in range(-8,9):
        d=math.hypot(dx,dy)
        if RMIN<=d<=RMAX: ann.append((dx,dy))
        if d<=RIN: inn.append((dx,dy))
print(f'gabarit: anneau {len(ann)} offsets (rayon {RMIN}-{RMAX}), interieur {len(inn)} offsets (r<={RIN})')
def score(cx,cy):
    # cx,cy = coin haut-gauche du pixel central-bas-droit ; on evalue sur centres demi-pixel
    a=sum(1 for dx,dy in ann if 0<=cx+dx<W and 0<=cy+dy<H and ring[cy+dy][cx+dx])
    i=sum(1 for dx,dy in inn if 0<=cx+dx<W and 0<=cy+dy<H and dark[cy+dy][cx+dx])
    return a/len(ann), i/len(inn)
print('--- controle POSITIF : badge "Laboratoire" centre (539.5,552.5) -> pixel (540,553) et (539,552) ---')
for p in [(540,553),(539,552),(540,552),(539,553)]:
    a,i=score(*p); print(f'   {p} anneau={a:.2f} interieur_sombre={i:.2f}')
print('--- controle NEGATIF : ampoules de guirlande (crop-C) ---')
for p in [(646,828),(558,876),(520,840),(463,923),(482,831)]:
    a,i=score(*p); print(f'   {p} anneau={a:.2f} interieur_sombre={i:.2f}')
print('--- controle NEGATIF 2 : fond de ciel et facade ---')
for p in [(100,300),(800,1500),(300,1000)]:
    a,i=score(*p); print(f'   {p} anneau={a:.2f} interieur_sombre={i:.2f}')

print('--- BALAYAGE COMPLET : seuils anneau>=0.45 et interieur_sombre>=0.60 ---')
hits=[]
for cy in range(8,H-8):
    for cx in range(8,W-8):
        if not ring[cy][cx-7] and not ring[cy][cx+7] and not ring[cy-7][cx] and not ring[cy+7][cx]:
            continue  # rejet rapide
        a,i=score(cx,cy)
        if a>=0.45 and i>=0.60: hits.append((a,i,cx,cy))
print('pixels candidats retenus =', len(hits))
# regroupement : maxima locaux, fusion des hits a moins de 6 px
hits.sort(key=lambda t:-t[0])
groups=[]
for a,i,cx,cy in hits:
    for gg in groups:
        if abs(gg['x']-cx)<=6 and abs(gg['y']-cy)<=6:
            gg['n']+=1; gg['sx']+=cx; gg['sy']+=cy; break
    else:
        groups.append({'x':cx,'y':cy,'a':a,'i':i,'n':1,'sx':cx,'sy':cy})
print(f'groupes = {len(groups)}')
groups.sort(key=lambda g:(g['y'],g['x']))
for k,g in enumerate(groups,1):
    print(f"  #{k:2d} centre=({g['sx']/g['n']:7.2f},{g['sy']/g['n']:7.2f}) pic=({g['x']},{g['y']}) anneau={g['a']:.2f} int={g['i']:.2f} npx={g['n']}")
