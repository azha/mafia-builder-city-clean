# -*- coding: utf-8 -*-
"""m38 - fleche retour (encre) et opacite resultante de la volute gauche, mesurees contre le
fond LOCAL pris sur la MEME ligne (a droite de l'objet), pas 12 CSS plus bas."""
import sys, math; sys.path.insert(0,'.')
from commun import *
print("=== m38 ===")
for cle in ['j1920','j2400']:
    im,f=ouvrir(cle); px=im.load()
    # fleche : x 23..40, y 19..30
    P=[px[xx,yy] for yy in range(int(19*f),int(30*f)) for xx in range(int(23*f),int(41*f)) if min(px[xx,yy])>=170]
    ce=tuple(int(mediane([c[k] for c in P])) for k in range(3))
    print("   %-6s fleche retour : %d px ; encre %s ; dist a --creme %d ; dist au blanc pur %d"
          %(cle,len(P),ce,dist_max(ce,JETONS['creme']),dist_max(ce,(255,255,255))))
    # volute gauche : encre sur la ligne y 25.5..26.4, fond pris a la meme ligne en x 18..22
    V=[px[xx,yy] for yy in range(int(25.2*f),int(26.6*f)) for xx in range(int(4*f),int(17*f))]
    Vc=[c for c in V if L(c)>0]
    enc=tuple(int(mediane([c[k] for c in sorted(Vc,key=lambda c:-L(c))[:len(Vc)//3]])) for k in range(3))
    F=[px[xx,yy] for yy in range(int(21*f),int(23*f)) for xx in range(int(4*f),int(17*f))]
    cf=tuple(int(mediane([c[k] for c in F])) for k in range(3))
    op=[(enc[k]-cf[k])/float(JETONS['creme'][k]-cf[k]) for k in range(3)]
    print("   %-6s volute G : encre %s ; fond a la meme abscisse (y 21..23) %s ; opacite resultante %s (canon .28)"
          %(cle,enc,cf,["%.2f"%o for o in op]))
im,f=ouvrir('canon'); px=im.load()
V=[px[xx,yy] for yy in range(int(25.2*f),int(26.6*f)) for xx in range(int(5*f),int(17*f))]
enc=tuple(int(mediane([c[k] for c in sorted(V,key=lambda c:-L(c))[:len(V)//3]])) for k in range(3))
F=[px[xx,yy] for yy in range(int(21*f),int(23*f)) for xx in range(int(5*f),int(17*f))]
cf=tuple(int(mediane([c[k] for c in F])) for k in range(3))
print("   canon  volute G : encre %s ; fond %s ; opacite resultante %s (cible .28)"
      %(enc,cf,["%.2f"%((enc[k]-cf[k])/float(JETONS['creme'][k]-cf[k])) for k in range(3)]))
