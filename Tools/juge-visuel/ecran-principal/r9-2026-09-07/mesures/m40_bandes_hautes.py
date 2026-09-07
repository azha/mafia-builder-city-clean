# m40 — bandes du haut a 2400 : panneau de fond, bande du nom de district (etendue, couleur, opacite)
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m40 bandes hautes (2400) et bande du nom de district ===')
idi=ouvrir(DIST,'district2400'); pd=idi.load()
i19=ouvrir(F1920,'fiche1920'); p19=i19.load()
print('   profil pleine largeur, planche district 2400 :')
prev=None; y0=140
for y in range(140,300):
    c=medrgb(pd,0,y,1080,y+1)
    if prev is None or dist_rgb(c,prev)>3:
        if prev is not None: print('      y %4d..%4d (%6.2f..%6.2f CSS) : %s' % (y0,y-1,y0/SC_CAPT,(y-1)/SC_CAPT,str(tuple(int(v) for v in prev))))
        y0=y; prev=c
print('      y %4d..%4d : %s' % (y0,299,str(tuple(int(v) for v in prev))))
print()
print('   bande du nom : la meme bande existe-t-elle a 1920 ? (l art y est different)')
for y in range(225,275,4):
    print('      y=%4d  2400 %s   1920 %s' % (y, str(medrgb(pd,0,y,1080,y+1)), str(medrgb(p19,0,y,1080,y+1))))
print()
print('   OPACITE de la bande du nom : l art sous elle est connu (2400 y=250 <-> art 10 ; 1920 y=250 <-> art 250).')
print('   -> on mesure plutot son ETENDUE en x : premiere et derniere colonne ou la bande assombrit l art')
# a 1920 : art nu a 2400 ligne y+240 ; bande a 1920 ligne y
for y in (232,240,250,260,266,268,272):
    d=[]
    for x in range(0,1080,4):
        u=pd[x,y+240] if y+240<2400 else None
        v=p19[x,y]
        if u: d.append(lum(u)-lum(v))
    print('      1920 y=%3d : assombrissement median par la bande = %+.4f L (art nu = 2400 y=%d)' % (y, med(d), y+240))
