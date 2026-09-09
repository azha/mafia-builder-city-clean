"""m11 — geometrie des blocs : panneau elastique, carte portrait, pile de tuiles, CTA.
Bord = mi-hauteur entre le plateau du fond et le plateau du trait (convention declaree).
Controle positif : les deux rails or du cadre doivent rendre 1038 px (REF) / 1044 (JEU),
valeurs deja obtenues par un autre chemin en m01.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def runs_ligne(im, y, x0, x1, nom):
    px = im.load()
    v = [lum(px[x, y]) for x in range(x0, x1+1)]
    fond = mediane(v); pic = max(v); s = (fond+pic)/2
    out = []; cur = None
    for i, val in enumerate(v):
        if val >= s:
            if cur is None: cur = [i, i]
            else: cur[1] = i
        else:
            if cur is not None: out.append((cur[0]+x0, cur[1]+x0)); cur = None
    if cur is not None: out.append((cur[0]+x0, cur[1]+x0))
    print(f"   {nom} y={y}: fond={fond:.1f} pic={pic:.1f} -> " +
          ", ".join(f"x{a}..{b}(l={b-a+1})" for a, b in out))
    return out

def runs_colonne(im, x, y0, y1, nom):
    px = im.load()
    v = [lum(px[x, y]) for y in range(y0, y1+1)]
    fond = mediane(v); pic = max(v); s = (fond+pic)/2
    out = []; cur = None
    for i, val in enumerate(v):
        if val >= s:
            if cur is None: cur = [i, i]
            else: cur[1] = i
        else:
            if cur is not None: out.append((cur[0]+y0, cur[1]+y0)); cur = None
    if cur is not None: out.append((cur[0]+y0, cur[1]+y0))
    print(f"   {nom} x={x}: fond={fond:.1f} pic={pic:.1f} -> " +
          ", ".join(f"y{a}..{b}(h={b-a+1})" for a, b in out))
    return out

print("\n===== REFERENCE =====")
im = ouvrir('../reference-1080x2102.png')
print(" panneau elastique : bord haut y=849, bord bas y=1612")
runs_ligne(im, 850, 20, 1060, 'bord haut du panneau elast.')
print(" carte portrait (filet or) : ligne a mi-hauteur de la carte")
runs_ligne(im, 1250, 30, 1050, 'x de la carte + tuiles')
runs_colonne(im, 200, 840, 1620, 'colonne 200 (carte)')
print(" CTA : ")
runs_colonne(im, 540, 1900, 2090, 'colonne 540 (CTA + filet bas)')

print("\n===== JEU 2400 =====")
im = ouvrir('../capture-1080x2400.png')
runs_ligne(im, 878, 20, 1060, 'bord haut du panneau elast.')
runs_ligne(im, 1250, 30, 1050, 'x de la carte + tuiles')
runs_colonne(im, 200, 870, 1560, 'colonne 200 (carte)')
runs_colonne(im, 540, 1830, 2115, 'colonne 540 (CTA + filet bas)')
