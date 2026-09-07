# -*- coding: utf-8 -*-
"""19 - Densite : part de l'aire qui n'est PAS le fond dominant, et nombre d'ARTICLES visibles.
CONTROLE POSITIF : dans la reference, la part de fond dominant doit etre nettement < 90 %
(l'ecran est meuble) ; dans une image ENTIEREMENT unie fabriquee ici, elle doit valoir 100 %.
CONTROLE NEGATIF : l'image unie -> 0 % d'encre."""
from PIL import Image
import os, statistics
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
def densite(im,box,nom,tol=10):
    z=im.crop(box); d=list(z.getdata())
    from collections import Counter
    q=Counter((p[0]>>3,p[1]>>3,p[2]>>3) for p in d)
    dom,ndom=q.most_common(1)[0]
    part=100.0*ndom/len(d)
    domc=(dom[0]<<3,dom[1]<<3,dom[2]<<3)
    encre=100.0*sum(1 for p in d if abs(lum(p)-lum(domc))>tol)/len(d)
    print("   %-42s fond dominant %s = %5.1f %% de l'aire ; encre (|dL|>%d) = %5.1f %%"%(nom,domc,part,tol,encre))
R=ouvrir('../reference-㉓-1080x2102.png'); C=ouvrir('../capture-1080x2400.png')
print()
densite(R,(20,590,1060,2090),"REF  la vitre + le bandeau de voix")
densite(C,(20,330,1060,2120),"CAP  tout le contenu sous le titre")
uni=Image.new('RGB',(400,400),(13,13,13))
densite(uni,(0,0,400,400),"CN   image unie fabriquee ici")
print()
print("--- nombre d'ARTICLES visibles ---")
print("   REF cadre #98 : 4 extras (2 colonnes x 2 rangees) + 1 boite de solde + 1 bandeau de voix")
print("   REF cadre #99 (source) : 4 packs (2x2) + 1 pack large 'Soutenir le studio' + 1 bandeau de voix")
print("   CAP           : 3 cartes entieres + 1 coupee = 3,8 articles visibles, 0 extra, 0 voix")
