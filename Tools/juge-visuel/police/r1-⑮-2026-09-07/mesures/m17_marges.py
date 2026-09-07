# -*- coding: utf-8 -*-
"""m17 — marges et emprise du contenu (capture vs canon serie 2), en px CSS.
        + verification du pixel anormal releve dans le sous-titre du canon (m15).
Contrôle positif : la carte .dist du canon doit mesurer ~274 CSS (CSS : corps padding 12 => 300-24).
Contrôle negatif : la meme mesure appliquee au titre du canon doit rendre nettement moins (~159 CSS).
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap = Image.open(os.path.join(D, 'capture-1080x2400.png')).convert('RGB')
can = Image.open(os.path.join(D, 'etats/inspections-canon.png')).convert('RGB')
print("OUVERT capture %s ; canon %s" % (cap.size, can.size))
pk = cap.convert('L').load(); pc = can.convert('L').load()

def bbox(p, W, x0, y0, x1, y1, s):
    xs = [x for x in range(x0, x1) if any(p[x, y] > s for y in range(y0, y1))]
    return (min(xs), max(xs)) if xs else None

print()
print("== CAPTURE : emprise horizontale, zone de contenu (y 200..1130), seuil 30 ==")
b = bbox(pk, 1080, 0, 200, 1080, 1130, 30)
print("   encre x=%d..%d  => marge gauche %.1f CSS, marge droite %.1f CSS, emprise %.1f CSS / 300"
      % (b[0], b[1], b[0]/3.6, (1080-1-b[1])/3.6, (b[1]-b[0]+1)/3.6))
b2 = bbox(pk, 1080, 0, 390, 1080, 1130, 30)   # sans le titre ni le sous-titre (centres)
print("   sans titre/sous-titre (y 390..1130) : x=%d..%d => emprise %.1f CSS, marge droite %.1f CSS"
      % (b2[0], b2[1], (b2[1]-b2[0]+1)/3.6, (1080-1-b2[1])/3.6))

print()
print("== CANON serie 2 : emprise de la carte .dist (y 262..640) ==")
c = bbox(pc, 900, 0, 262, 900, 640, 19)
print("   x=%d..%d => marge gauche %.1f CSS, marge droite %.1f CSS, emprise %.1f CSS / 300"
      % (c[0], c[1], c[0]/3.0, (900-1-c[1])/3.0, (c[1]-c[0]+1)/3.0))
t = bbox(pc, 900, 140, 60, 700, 100, 46)
print("CONTROLE POSITIF carte ~274 CSS : %.1f" % ((c[1]-c[0]+1)/3.0))
print("CONTROLE NEGATIF titre nettement moins : %.1f CSS" % ((t[1]-t[0]+1)/3.0))

print()
print("== verification du pixel anormal (m15) dans le sous-titre du canon ==")
best = None
for y in range(125, 153):
    for x in range(149, 505):
        c2 = can.getpixel((x, y)); s = sum(c2)
        if best is None or s > best[0]: best = (s, x, y, c2)
print("   pixel le plus clair de la boite = x=%d y=%d RGB=%s" % (best[1], best[2], best[3]))
print("   voisinage (y=%d) : %s" % (best[2], [can.getpixel((x, best[2])) for x in range(best[1]-3, best[1]+4)]))
