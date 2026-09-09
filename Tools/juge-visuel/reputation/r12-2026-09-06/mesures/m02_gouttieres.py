import sys; sys.path.insert(0,'.')
from lib import *

def profil_encre(im, seuil=None, xmin=0, xmax=None):
    """par ligne : nb de px dont la luminance s'ecarte du fond local de plus de `seuil`"""
    p = px(im); W,H = im.size
    xmax = W if xmax is None else xmax
    out=[]
    for y in range(H):
        # fond = mediane de la ligne
        vals = sorted(lum(p[x,y]) for x in range(xmin,xmax))
        med = vals[len(vals)//2]
        n = sum(1 for x in range(xmin,xmax) if abs(lum(p[x,y])-med) > seuil)
        out.append((n, med))
    return out

FICHIERS = [
 ('C2400 ', '../capture-1080x2400.png', 482, 2109),
 ('C1920 ', '../capture-1080x1920.png', 250, 1629),
 ('S2400 ', '../capture-ecran-seul-1080x2400.png', 730, 2109),
 ('S1920T', '../capture-ecran-seul-1080x1920-T.png', 250, 1629),
]
print("=== m02 : chrome, dock, gouttieres ===")
for nom, f, ctop, cbot in FICHIERS:
    im = ouvrir(f); W,H = im.size
    pr = profil_encre(im, seuil=18)
    # derniere ligne d'encre AVANT le cadre (chrome haut)
    haut = [y for y in range(0, ctop) if pr[y][0] > 6]
    # premiere ligne d'encre APRES le cadre (dock)
    bas  = [y for y in range(cbot+1, H) if pr[y][0] > 6]
    print(f"  {nom}: cadre {ctop}..{cbot} (h={cbot-ctop+1})")
    print(f"     derniere encre au-dessus du cadre : {max(haut) if haut else None}  -> gouttiere haute = {ctop-max(haut) if haut else 'n/a'}")
    print(f"     premiere encre sous le cadre      : {min(bas) if bas else None}  -> gouttiere basse = {min(bas)-cbot if bas else 'n/a'}")
print()
print("--- controle positif : la reference, meme instrument ---")
im = ouvrir('../reference-1080x2102.png')
pr = profil_encre(im, seuil=18)
haut = [y for y in range(0,452) if pr[y][0] > 6]
bas = [y for y in range(2079,2102) if pr[y][0] > 6]
print(f"  REF: cadre 452..2078 (h=1627); derniere encre au-dessus={max(haut)} -> gouttiere {452-max(haut)}; encre sous={min(bas) if bas else None}")
