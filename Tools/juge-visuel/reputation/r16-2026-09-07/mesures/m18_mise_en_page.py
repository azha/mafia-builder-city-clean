# m18 : mise en page — zone libre, position du cadre, vide au-dessus/au-dessous, losange.
import sys; sys.path.insert(0,'.')
from lib import *

print("### REFERENCE (evocation de chrome) ###")
im=ouvrir('reference-1080x2102.png'); px=im.load()
# bas de l'evocation de chrome : derniere rangee du bloc decor au-dessus du cadre
print("   cadre : y=452..2078 (h=1627)")
print("   sous le cadre, colonne x=540 :", " ".join("%d:%.0f"%(y,lum(px[540,y])) for y in range(2076,2102,2)))
print("   au-dessus du cadre, colonne x=540 :", " ".join("%d:%.0f"%(y,lum(px[540,y])) for y in range(424,460,2)))
# largeur du .tel : bord gauche/droit du contenu
row=[lum(px[x,1200]) for x in range(0,1080)]
xs=[x for x in range(1080) if row[x]>6]
print("   .tel : x=%d..%d (l=%d)" % (min(xs),max(xs),max(xs)-min(xs)+1))

print("\n### CAPTURES ###")
for nom,H,cadre in [('capture-1080x2400.png',2400,(482,2109)),('capture-1080x1920.png',1920,(250,1629))]:
    im=ouvrir(nom); px=im.load()
    a,b=cadre
    DOCK_H=248  # mesure sur le TEMOIN (bord net y=2152 sur 2400)
    dock=H-DOCK_H
    inset=232   # 275 u x 0,84375 ; verifie ci-dessous par le losange
    print("   filet du bandeau y=141 ; haut du dock (report du temoin) y=%d" % dock)
    print("   zone libre = %d..%d = %d px" % (inset,dock-1,dock-inset))
    print("   cadre %d..%d = %d px -> occupation %.1f %% de la zone libre" % (a,b,b-a+1,100.0*(b-a+1)/(dock-inset)))
    print("   vide AU-DESSUS du cadre (inset->cadre) = %d px ; vide AU-DESSOUS (cadre->dock) = %d px" % (a-inset, dock-b-1))
    # losange dore du chrome
    ys=[y for y in range(180,280) if any(est_or(px[x,y]) for x in range(500,580))]
    if ys:
        xs=[x for x in range(500,580) if any(est_or(px[x,y]) for y in range(180,280))]
        print("   losange du chrome : y=%d..%d (h=%d) x=%d..%d (l=%d)" % (min(ys),max(ys),max(ys)-min(ys)+1,min(xs),max(xs),max(xs)-min(xs)+1))
    print()
