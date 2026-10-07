# m1 — reperes : bornes du panneau LA SUITE, de la plaque TRANCHER, du dock, du bandeau.
# Methode : profils de luminance par ligne/colonne. Aucun nombre n'est devine.
import sys
from PIL import Image

import sys; sys.path.insert(0,'/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/r5-2026-10-07/mesures'); from _base import REF,J19,J24,lum,charge


def profil_colonne(im, y0, y1):
    "luminance moyenne par colonne sur la bande y0..y1"
    px=im.load(); w,h=im.size
    out=[]
    for x in range(w):
        s=0
        for y in range(y0,y1):
            s+=lum(px[x,y])
        out.append(s/(y1-y0))
    return out

def profil_ligne(im, x0, x1):
    px=im.load(); w,h=im.size
    out=[]
    for y in range(h):
        s=0
        for x in range(x0,x1):
            s+=lum(px[x,y])
        out.append(s/(x1-x0))
    return out

def bords_panneau(im, nom, ybande):
    """le panneau est un aplat sombre tres plat ; on le trouve par la VARIANCE
    par colonne (le decor est bruite, le panneau est plat)."""
    px=im.load(); w,h=im.size
    y0,y1=ybande
    var=[]
    for x in range(w):
        vals=[lum(px[x,y]) for y in range(y0,y1,3)]
        m=sum(vals)/len(vals)
        var.append(sum((v-m)**2 for v in vals)/len(vals))
    # bord gauche = premiere colonne ou la variance tombe sous 6 et y reste
    def premier(seq, rng):
        for x in rng:
            if all(seq[k]<6.0 for k in range(x, x+8) if 0<=k<w): return x
        return None
    g=premier(var, range(0,w//2))
    d=premier(var, range(w-1, w//2, -1))
    print(f'  {nom}: panneau x {g}..{d}  (largeur {None if g is None else d-g+1})')
    return g,d

for nom,p,ybande in [('REF',REF,(1000,1200)),('JEU1920',J19,(900,1100)),('JEU2400',J24,(1200,1400))]:
    im=charge(p)
    bords_panneau(im,nom,ybande)
