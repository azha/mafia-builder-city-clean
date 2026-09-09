# -*- coding: utf-8 -*-
"""m17 — vérifications des grandeurs encore estimées : flèche retour, jauge d'argent, ronds du dock,
couleur du COEUR de l'anneau braise (et non de sa frange).
Contrôle positif : la couleur du coeur du filet (2 lignes pleines, y=141-142) doit être stable."""
import commun as C

print('== m17 : verifications ==')
cap = C.ouvrir('capture')
p = cap.load()

print('\n-- fleche retour (bandeau, moitie gauche) --')
bb,n = C.bbox_encre(cap, 40, 40, 165, 120, 90, 'clair')
print('   bbox=%s  l=%d h=%d n=%d  couleur mediane %s'
      % (str(bb), bb[2]-bb[0]+1, bb[3]-bb[1]+1, n, C.hx(C.mediane_fenetre(cap,(bb[0]+bb[2])//2,(bb[1]+bb[3])//2,2))))

print('\n-- jauge or sous la valeur ARGENT (bande pleine, sans le pivot d aiguille) --')
segs=[]; dedans=False
y=116
for x in range(150, 470):
    q=p[x,y]; ok = q[0]>150 and q[1]>110 and q[2]<140 and q[0]-q[2]>60
    if ok and not dedans: dedans=True; d=x
    elif not ok and dedans: dedans=False; segs.append((d,x-1,x-d))
if dedans: segs.append((d,469,470-d))
print('   y=%d segments or : %s' % (y, segs))
# hauteur
col=[yy for yy in range(100,135) if (lambda q: q[0]>150 and q[1]>110 and q[2]<140 and q[0]-q[2]>60)(p[300,yy])]
print('   epaisseur a x=300 : y=%d..%d (%d px)' % (min(col), max(col), len(col)))

print('\n-- ronds du dock : extension verticale --')
xs = 258  # centre du 1er rond
col=[yy for yy in range(2140, 2320) if (lambda q: q[2]>q[0]+8 and 28<q[2]<95)(p[xs,yy])]
if col: print('   rond 1, colonne x=%d : y=%d..%d  (hauteur %d px)' % (xs, min(col), max(col), max(col)-min(col)+1))

print('\n-- COEUR de l anneau braise et du filet (mediane, pas la frange) --')
print('   filet du bandeau, y=141, mediane sur x=100..1000 :')
pts=[p[x,141] for x in range(100,1000,5)]
med=tuple(sorted(c[i] for c in pts)[len(pts)//2] for i in range(3))
print('      %s   ecart a --braise (224,102,74) = (%+d,%+d,%+d)' % (C.hx(med), med[0]-224, med[1]-102, med[2]-74))
print('   anneau du medaillon : pixels les plus satures de l anneau (x 448..470 et 610..631) :')
pts=[p[x,y] for y in range(60,130) for x in list(range(448,472))+list(range(608,632)) if p[x,y][0]>150 and p[x,y][0]-p[x,y][1]>60]
if pts:
    pts.sort(key=lambda c:-(c[0]-c[2]))
    top=pts[:max(1,len(pts)//5)]
    med=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
    print('      %s (n=%d)   ecart a --braise = (%+d,%+d,%+d)' % (C.hx(med), len(pts), med[0]-224, med[1]-102, med[2]-74))
print('   accroche des cartes, pixels les plus satures :')
pts=[p[x,y] for y in range(445,490) for x in range(275,808) if p[x,y][0]>150 and p[x,y][0]-p[x,y][1]>60]
pts.sort(key=lambda c:-c[0]); top=pts[:max(1,len(pts)//5)]
med=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
print('      %s (n=%d)   ecart a --braise = (%+d,%+d,%+d)' % (C.hx(med), len(pts), med[0]-224, med[1]-102, med[2]-74))
print('   jetons rouges (contour), pixels les plus satures :')
pts=[p[x,y] for y in range(524,545) for x in range(322,758) if p[x,y][0]>110 and p[x,y][0]-p[x,y][1]>50]
pts.sort(key=lambda c:-c[0]); top=pts[:max(1,len(pts)//5)]
med=tuple(sorted(c[i] for c in top)[len(top)//2] for i in range(3))
print('      %s (n=%d)   ecart a --braise = (%+d,%+d,%+d)' % (C.hx(med), len(pts), med[0]-224, med[1]-102, med[2]-74))

# --- ajout : piste de la jauge d'argent (chrome)
print('\n-- jauge d argent : y a-t-il une PISTE non remplie ? --')
print('   capture : or x=176..379 (204 px, epaisseur 6 px, y=118..123) ;')
print('             a droite : x=385/400/420/440 -> fond du bandeau, AUCUNE piste')
print('   canon HUD : or x=48..198 (151 px) PUIS piste #5a6376 jusqu a ~x=270')

print('\n-- diametre des ronds du dock : capture vs canon HUD (ligne passant par le centre) --')
hud = C.ouvrir('hud'); ph = hud.load()
def rond(im, pxl, nom, y, x0, x1):
    segs=[]; dedans=False
    for x in range(x0,x1):
        q=pxl[x,y]; ok = q[2]>q[0]+8 and 28<q[2]<110
        if ok and not dedans: dedans=True; d=x
        elif not ok and dedans: dedans=False; segs.append((d,x-1,x-d))
    segs=[s for s in segs if s[2]>40]
    if segs:
        s=segs[0]
        print('   %-12s y=%4d  rond x=%d..%d  diametre %d px = %.2f %% de %d' % (nom,y,s[0],s[1],s[2],100.0*s[2]/im.size[0],im.size[0]))
rond(cap, p, 'capture', 2242, 150, 400)
for y in (1930, 1945, 1960):
    rond(hud, ph, 'canon HUD', y, 180, 420)
