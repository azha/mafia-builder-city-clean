# m25 — textes du bandeau : ARGENT / JOUR.. / valeur droite : boites, hauteur de capitale, couleur, contraste
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m25 textes du bandeau (encre, capitale, contraste) ===')

def bloc(px, sc, x0,x1,y0,y1, fond, seuil=0.012):
    """retourne bbox + couleur d'encre + contraste, sur les pixels dont la luminance depasse le fond"""
    pts=[]
    for y in range(int(y0*sc),int(y1*sc)):
        for x in range(int(x0*sc),int(x1*sc)):
            c=px[x,y]
            if abs(lum(c)-lum(fond))>seuil: pts.append((x,y,c))
    if not pts: return None
    xs=[p[0] for p in pts]; ys=[p[1] for p in pts]
    # encre = mediane des 25 % les plus contrastes
    pts2=sorted(pts,key=lambda p:-abs(lum(p[2])-lum(fond)))[:max(4,len(pts)//4)]
    enc=tuple(int(med([p[2][i] for p in pts2])) for i in range(3))
    return (min(xs)/sc,max(xs)/sc,min(ys)/sc,max(ys)/sc,len(pts),enc,contraste(enc,fond))

CFG=[(CANON,'canon',SC_CANON),(DIST,'district2400',SC_CAPT),(F1920,'fiche1920',SC_CAPT)]
ZONES_C=[('lib ARGENT',10,90,4,14),('val montant',10,90,18,36),('lib droite',250,392,4,16),('val droite',250,392,16,38)]
ZONES_J=[('lib ARGENT',55,140,4,14),('val montant',55,175,20,40),('lib droite',300,392,6,20),('val droite',300,392,20,40)]
for path,nom,sc in CFG:
    im=ouvrir(path,nom); px=im.load()
    zones = ZONES_C if nom=='canon' else ZONES_J
    print('   --- %s ---'%nom)
    for lab,x0,x1,y0,y1 in zones:
        fond = medrgb(px, int((x1-6)*sc), int(y0*sc), int(x1*sc), int(y1*sc))
        # fond plus sur : mediane de toute la fenetre (le texte est minoritaire)
        fond = medrgb(px, int(x0*sc), int(y0*sc), int(x1*sc), int(y1*sc))
        r=bloc(px,sc,x0,x1,y0,y1,fond)
        if not r: print('      %-12s : rien'%lab); continue
        print('      %-12s : x %6.2f..%6.2f  y %6.2f..%6.2f  haut %5.2f CSS ; %4d px ; encre %s sur fond %s ; contraste %.2f:1'
              % (lab,r[0],r[1],r[2],r[3],r[3]-r[2]+1/sc,r[4],str(r[5]),str(tuple(int(v) for v in fond)),r[6]))
