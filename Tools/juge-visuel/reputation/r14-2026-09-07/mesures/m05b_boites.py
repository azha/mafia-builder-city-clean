"""m05b — boites de compteur par leur BORD SUPERIEUR (lisere horizontal), qui donne
directement l'etendue en x de chaque boite. Convention de bord : mi-hauteur.
Controle positif : 3 boites de largeurs egales a +-2 px dans la REFERENCE.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

def runs_sur_ligne(im, y, nom, marge=30):
    px = im.load(); W = im.size[0]
    v = [lum(px[x, y]) for x in range(W)]
    fond = mediane(v[marge:W-marge])
    pic = max(v[marge:W-marge])
    seuil = (fond + pic) / 2.0
    out = []; cur = None
    for x in range(marge, W - marge):
        if v[x] >= seuil:
            if cur is None: cur = [x, x]
            else: cur[1] = x
        else:
            if cur is not None: out.append(tuple(cur)); cur = None
    if cur is not None: out.append(tuple(cur))
    print(f"  {nom} y={y}: fond={fond:.1f} pic={pic:.1f} seuil={seuil:.1f}")
    for a, b in out:
        print(f"     x={a}..{b}  l={b-a+1}")
    return out

im = ouvrir('../reference-1080x2102.png')
print("REF : bord haut de la rangee de compteurs")
r = runs_sur_ligne(im, 703, 'REF')
print("REF : bord bas")
runs_sur_ligne(im, 814, 'REF')
im = ouvrir('../capture-1080x2400.png')
print("JEU2400 : bord haut")
runs_sur_ligne(im, 729, 'JEU2400')
print("JEU2400 : bord bas")
runs_sur_ligne(im, 839, 'JEU2400')
