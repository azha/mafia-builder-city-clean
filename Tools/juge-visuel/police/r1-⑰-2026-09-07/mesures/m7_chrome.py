# -*- coding: utf-8 -*-
"""m7 — chrome : bandeau (médaillon, ailes) et dock, capture vs canon HUD (hud-canon-1176.png, 392 CSS x3).
Echelle : canon HUD 1176 px = 392 CSS ; capture 1080 px = 392 CSS  -> rapport capture/canon = 0,9184.
Contrôle positif : la largeur d'écran en CSS est la MÊME (392) des deux côtés -> tout %/largeur est comparable."""
import commun as C

print('== m7 : chrome ==')
cap = C.ouvrir('capture'); hud = C.ouvrir('hud')
RC = 1080.0/1176.0
print('   rapport d echelle capture/canonHUD = %.4f' % RC)

def bbox_couleur(im, x0,y0,x1,y1, test):
    p = im.load(); mnx,mny,mxx,mxy,n = 10**9,10**9,-1,-1,0
    for y in range(y0,y1):
        for x in range(x0,x1):
            if test(p[x,y]):
                n+=1
                mnx=min(mnx,x); mny=min(mny,y); mxx=max(mxx,x); mxy=max(mxy,y)
    return (None,0) if n==0 else ((mnx,mny,mxx,mxy), n)

# --- medaillon : disque sombre cercle avec anneau clair. On cherche l'anneau (braise ou laiton)
print('\n-- MEDAILLON --')
def anneau(im, nom, zone, test):
    bb,n = bbox_couleur(im, *zone, test=test)
    if bb:
        print('   %-22s bbox=(%4d,%4d,%4d,%4d)  diametre l=%3d h=%3d  centre x=%.1f (%.1f %% de la largeur)  n=%d'
              % (nom, bb[0],bb[1],bb[2],bb[3], bb[2]-bb[0]+1, bb[3]-bb[1]+1, (bb[0]+bb[2])/2,
                 100.0*(bb[0]+bb[2])/2/im.size[0], n))
    return bb

braise = lambda p: p[0]>120 and p[0]-p[1]>45 and p[0]-p[2]>45
laiton = lambda p: p[0]>110 and p[1]>80 and p[2]<110 and p[0]-p[2]>50 and abs(p[0]-p[1])<70
bb_cap = anneau(cap, 'capture (braise)', (330,0,760,190), braise)
bb_hud = anneau(hud, 'canon HUD (laiton)', (400,0,800,220), laiton)

print('\n-- ARGENT : le texte touche-t-il le medaillon ? --')
bb_arg,_ = C.bbox_encre(cap, 150, 55, 640, 110, 70, 'clair')
print('   valeur argent bbox=%s (droite x=%d)' % (str(bb_arg), bb_arg[2]))
if bb_cap:
    print('   medaillon (anneau braise) gauche x=%d' % bb_cap[0])
    print('   -> RECOUVREMENT = %d px  (positif = le texte passe SOUS le medaillon)' % (bb_arg[2]-bb_cap[0]+1))
    # le disque du medaillon est plus large que l'anneau ? on cherche le disque sombre bleute
print('\n   CONTRÔLE : meme mesure sur le canon HUD --')
bb_argh,_ = C.bbox_encre(hud, 100, 40, 700, 130, 70, 'clair')
print('   canon HUD : valeur argent bbox=%s ; anneau gauche x=%d ; ecart = %d px'
      % (str(bb_argh), bb_hud[0], bb_hud[0]-bb_argh[2]-1))

print('\n-- DOCK --')
def dock(im, nom, y0, y1):
    # cercles sombres bleutes du dock
    p = im.load(); W,H = im.size
    cols=[]
    for x in range(W):
        n=0
        for y in range(y0,y1):
            r,g,b = p[x,y]
            if b>r+8 and b>28 and b<90: n+=1
        cols.append((x,n))
    segs=[]; dedans=False
    for x,n in cols:
        if n>4 and not dedans: dedans=True; d=x
        elif n<=4 and dedans: dedans=False; segs.append((d,x-1,x-d))
    if dedans: segs.append((d,W-1,W-d))
    segs=[s for s in segs if s[2]>20]
    print('   %-16s %d rond(s) : %s' % (nom, len(segs), ['x%d..%d (%d px, centre %.1f%%)'%(a,b,c,100.0*(a+b)/2/W) for a,b,c in segs]))
    return segs
dock(cap, 'capture', 2170, 2290)
dock(hud, 'canon HUD', 1900, 2010)

print('\n-- hauteur du dock (capture) : premiere ligne non-fond en partant du bas --')
p = cap.load()
for y in range(2399, 2100, -1):
    dif = sum(1 for x in range(0,1080,3) if p[x,y] != (13,13,13))
    if dif > 300:
        continue
    print('   premiere ligne (en remontant) majoritairement fond de contenu : y=%d' % y); break
