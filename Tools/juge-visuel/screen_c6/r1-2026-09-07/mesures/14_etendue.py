# -*- coding: utf-8 -*-
"""Etendue horizontale des boites, mesuree SUR LA LIGNE DE BORD elle-meme (pas sur une mediane de bande).
Un pixel est 'bord' s'il s'ecarte de plus de 14/canal du fond de la MEME ligne pris a x=5.
CONTROLE POSITIF : la ligne de bord bas de l'enseigne de la REFERENCE (y=643) doit rendre une plage
                   large (>= 200 CSS) ; CONTROLE NEGATIF : une ligne de fond pur (ref y=760) doit rendre
                   une plage vide ou tres courte."""
import os
from PIL import Image
D=os.path.dirname(os.path.abspath(__file__)); R=os.path.dirname(D)
S=3.6
def plage(im,y,seuil=14,ref_x=4):
    px=im.load(); w,h=im.size
    f=px[ref_x,y]
    xs=[x for x in range(w) if max(abs(px[x,y][i]-f[i]) for i in range(3))>=seuil]
    if not xs: return None
    return xs[0], xs[-1], px[xs[0],y], px[xs[-1],y]

def show(f, lignes):
    im=Image.open(os.path.join(R,f)).convert("RGB")
    print("\n### %s %dx%d" % (f, im.size[0], im.size[1]))
    for nom,y in lignes:
        p=plage(im,y)
        if p is None: print("  %-22s y=%4d : AUCUN pixel hors fond" % (nom,y)); continue
        x0,x1,c0,c1=p
        print("  %-22s y=%4d : x=%4d..%4d  l=%4d px = %6.1f CSS = %5.1f%% ecran | bordG rgb%s bordD rgb%s"
              % (nom,y,x0,x1,x1-x0+1,(x1-x0+1)/S,100.0*(x1-x0+1)/im.size[0],c0,c1))

show("reference-1080x2102.png", [
  ("cerne haut",453),("enseigne haut (ardoise)",482),("enseigne bas (or 2px)",643),
  ("compteurs haut",669),("compteurs bas",758),("elast haut",820),("elast bas",1864),
  ("cta6 haut",1903),("cta6 bas",1994),("cerne bas",2077),("FOND PUR (ctrl neg)",760)])

show("capture-ecran-seul-etat-vide-1080x2400.png", [
  ("enseigne haut (or)",280),("enseigne bas (or)",460),("compteurs haut",496),("compteurs bas",644),
  ("elast haut",679),("elast bas",1818),("pann haut",1854),("pann bas",2102),
  ("FOND PUR (ctrl neg)",250)])

show("capture-1080x2400.png", [
  ("filet bandeau (or)",141),("enseigne haut",280),("pann bas",2102)])

show("capture-ecran-seul-1080x1920.png", [
  ("enseigne haut",280),("enseigne bas",460),("compteurs haut",496),("compteurs bas",644),
  ("elast haut",679),("elast bas",1338),("pann haut",1374),("pann bas",1622)])
