# -*- coding: utf-8 -*-
"""m5 — les cadres des deux rangées d'action : le rail horizontal est-il continu ?
Où est le trou, est-il central, est-il symétrique haut/bas ?
Contrôle positif : le même balayage sur le cadre des CARTES 1 et 2 (visiblement continues)
doit rendre UN seul segment allant d'un bord à l'autre."""
import commun as C

print('== m5 : continuite des cadres ==')
cap = C.ouvrir('capture')
px = cap.load()

def segments_rail(y, x0=0, x1=1080, seuil=45):
    """segments contigus de pixels 'trait' (L>seuil) sur la ligne y."""
    segs=[]; dedans=False
    for x in range(x0,x1):
        r,g,b = px[x,y]
        l=(r*299+g*587+b*114)//1000
        if l>seuil and not dedans: dedans=True; d=x
        elif l<=seuil and dedans: dedans=False; segs.append((d,x-1,x-d))
    if dedans: segs.append((d,x1-1,x1-d))
    return [s for s in segs if s[2]>=3]

def analyse(nom, ytop, ybot):
    print('\n-- %s --' % nom)
    for etiq, y in [('rail HAUT', ytop), ('rail BAS', ybot)]:
        segs = segments_rail(y)
        tot = sum(s[2] for s in segs)
        if segs:
            gx0, gx1 = segs[0][0], segs[-1][1]
            couvert = 100.0*tot/(gx1-gx0+1)
        else:
            gx0=gx1=0; couvert=0
        print('   %s y=%4d : %d segment(s), empan x=%d..%d, couverture %.1f %%'
              % (etiq, y, len(segs), gx0, gx1, couvert))
        for d,f,w in segs:
            print('        segment x %4d..%4d (%3d px)' % (d,f,w))
        # trous
        for i in range(len(segs)-1):
            t0, t1 = segs[i][1]+1, segs[i+1][0]-1
            centre_trou = (t0+t1)/2.0
            centre_cadre = (gx0+gx1)/2.0
            print('        TROU x %4d..%4d (%3d px) — centre du trou %.1f / centre du cadre %.1f -> decalage %+.1f px'
                  % (t0,t1,t1-t0+1, centre_trou, centre_cadre, centre_trou-centre_cadre))

analyse('RANGEE 1 "Recruter un greffier"', 895, 1006)
analyse('RANGEE 2 "Acheter un renseignement"', 1039, 1151)
print('\n-- CONTRÔLE POSITIF : cadres des cartes 1 et 2 (visiblement continus) --')
analyse('CARTE 1', 348, 587)
analyse('CARTE 2', 622, 861)
