# -*- coding: utf-8 -*-
"""m18 — chrome de la capture : filet, medaillon (arc, aiguille, texte), barre ARGENT, dock.
Temoin d'ETAT : compte BRULANT => variante .chaud, quatre regles en --braise (224,102,74).
Contrôle positif : le filet du bandeau doit etre braise (ecart <= 10/255) — c'est la regle .chaud.
Contrôle negatif : le meme test applique au titre de l'ecran (or) doit ECHOUER (ecart > 60).
"""
from PIL import Image
import os, math
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
im = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
hud = Image.open(os.path.join(D, 'hud-canon-1176.png')).convert('RGB')
print("OUVERT capture %s ; hud-canon %s" % (im.size, hud.size)); px = im.load(); ph = hud.load()
BRAISE = (224,102,74); OR = (217,171,78); ORVIF = (242,201,107); CREME = (234,224,200); LAITON=(176,141,62)
def ec(a, b): return max(abs(a[i]-b[i]) for i in range(3))
def pur(p, x0, y0, x1, y1):
    best = None
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = p[x, y]; s = sum(c)
            if best is None or s > best[0]: best = (s, c)
    return best[1]

f = px[200, 141]
print("filet du bandeau y=141 : %s ; ecart au jeton braise = %d" % (f, ec(f, BRAISE)))
print("CONTROLE POSITIF filet braise (<=10) :", ec(f, BRAISE) <= 10)
t = pur(px, 396, 268, 828, 303)
print("CONTROLE NEGATIF titre teste contre braise : ecart = %d (doit etre >60)" % ec(t, BRAISE))
print()
# --- medaillon
print("MEDAILLON")
anneau = pur(px, 448, 88, 456, 100)
print("  anneau (x448..456, y88..100) : %s  ecart braise=%d  ecart laiton=%d" % (anneau, ec(anneau, BRAISE), ec(anneau, LAITON)))
val = pur(px, 470, 118, 610, 152)   # 'Brulant'
lib = pur(px, 480, 158, 600, 178)   # 'CHALEUR'
print("  valeur 'Brulant'  : %s  ecart braise=%d  ecart creme=%d" % (val, ec(val, BRAISE), ec(val, CREME)))
print("  libelle 'CHALEUR' : %s  ecart creme=%d" % (lib, ec(lib, CREME)))
# arc : gauche (teal attendu) / droite (braise attendu)
def zone(x0,y0,x1,y1):
    best=None
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            c=px[x,y]
            if max(c)-min(c) > 25:
                s=sum(c)
                if best is None or s>best[0]: best=(s,c,x,y)
    return best
zg = zone(480, 70, 520, 100); zd = zone(560, 70, 600, 100)
print("  arc GAUCHE  : %s (x=%s,y=%s)" % (zg[1], zg[2], zg[3]) if zg else "  arc GAUCHE : rien")
print("  arc DROITE  : %s (x=%s,y=%s)" % (zd[1], zd[2], zd[3]) if zd else "  arc DROITE : rien")
if zg and zd:
    print("  => gauche %s / droite %s : %s" % (
        'froid' if zg[1][2] > zg[1][0] else 'chaud',
        'chaud' if zd[1][0] > zd[1][2] else 'froid',
        'sens CANONIQUE (froid a gauche, chaud a droite)' if (zg[1][2] > zg[1][0] and zd[1][0] > zd[1][2]) else 'A VERIFIER'))
# aiguille : pixel creme le plus eloigne du pivot
piv = (540, 112)
best = None
for y in range(60, 120):
    for x in range(470, 615):
        c = px[x, y]
        if min(c) > 150 and max(c)-min(c) < 60:
            d = math.hypot(x-piv[0], y-piv[1])
            if best is None or d > best[0]: best = (d, x, y, c)
if best:
    ang = math.degrees(math.atan2(piv[1]-best[2], best[1]-piv[0]))
    print("  aiguille : bout le plus loin du pivot (540,112) = (%d,%d) %s ; angle=%.1f deg (90=haut, >90=gauche, <90=droite)"
          % (best[1], best[2], best[3], ang))
print()
print("BARRE ARGENT (sous le montant)")
b = None
for y in range(110, 130):
    n = sum(1 for x in range(150, 400) if ec(px[x, y], OR) < 60 or ec(px[x, y], LAITON) < 60)
    if n > 50: b = (y, n); break
print("  ligne de barre : %s" % (b,))
if b:
    xs = [x for x in range(120, 500) if ec(px[x, b[0]], OR) < 60 or ec(px[x, b[0]], LAITON) < 60]
    print("  barre x=%d..%d (l=%d) couleur=%s" % (min(xs), max(xs), max(xs)-min(xs)+1, px[(min(xs)+max(xs))//2, b[0]]))
    # partie non remplie ?
    reste = [x for x in range(max(xs)+1, max(xs)+120) if sum(px[x, b[0]]) > 3*30]
    print("  partie NON remplie a droite de la barre : %d px" % len(reste))
hb = None
for y in range(110, 140):
    n = sum(1 for x in range(40, 300) if ec(ph[x, y], OR) < 60 or ec(ph[x, y], LAITON) < 60)
    if n > 50: hb = y; break
if hb:
    xs = [x for x in range(20, 400) if ec(ph[x, hb], OR) < 60 or ec(ph[x, hb], LAITON) < 60]
    reste = [x for x in range(max(xs)+1, max(xs)+140) if sum(ph[x, hb]) > 3*30]
    print("  HUD CANON : barre y=%d x=%d..%d (l=%d) ; partie non remplie a droite = %d px"
          % (hb, min(xs), max(xs), max(xs)-min(xs)+1, len(reste)))

# ---- complement (2e passe) : losange, aile droite, dock
print()
print("COMPLEMENT")
def pur2(p, x0, y0, x1, y1):
    best = None
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            c = p[x, y]; s = sum(c)
            if best is None or s > best[0]: best = (s, c)
    return best[1]
lo = pur2(px, 525, 212, 556, 235)
print("  losange sous le medaillon : %s  ecart laiton=%d  ecart or=%d" % (lo, ec(lo, LAITON), ec(lo, OR)))
ad = pur2(px, 980, 60, 1050, 100)
print("  valeur de l'aile droite ('-') : %s  ecart braise=%d  ecart creme=%d (regle .chaud : --braise)"
      % (ad, ec(ad, BRAISE), ec(ad, CREME)))
lb = pur2(px, 930, 20, 1060, 50)
print("  libelle de l'aile droite ('JOUR 50') : %s  ecart creme-2(185,173,146)=%d" % (lb, ec(lb, (185,173,146))))
al = pur2(px, 170, 20, 300, 48)
print("  libelle ARGENT : %s ; valeur ARGENT : %s (regle .aile.gauche .val = --or-vif 242,201,107)"
      % (al, pur2(px, 176, 55, 450, 110)))
fl = pur2(px, 60, 60, 110, 90)
print("  fleche retour : %s" % (fl,))
# dock : diametre des ronds et libelles
g2 = im.convert('L').load()
ys = [y for y in range(2150, 2400) if sum(1 for x in range(1080) if g2[x, y] > 24) > 3]
print("  dock : encre y=%d..%d" % (min(ys), max(ys)))
cols = [x for x in range(1080) if any(g2[x, y] > 26 for y in range(2179, 2300))]
seg = []; cur = None
for x in cols:
    if cur is None or x-cur[1] > 10:
        if cur: seg.append(tuple(cur))
        cur = [x, x]
    else: cur = [cur[0], x]
if cur: seg.append(tuple(cur))
print("  ronds du dock : %d ; %s" % (len(seg), ["%d..%d(d=%d)" % (a, b, b-a+1) for a, b in seg]))
