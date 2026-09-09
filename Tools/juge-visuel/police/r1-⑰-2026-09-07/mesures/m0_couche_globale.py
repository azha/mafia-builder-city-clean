# -*- coding: utf-8 -*-
"""m0 — couche globale : tailles, palettes quantifiées, luminance moyenne, densité d'encre.
Contrôle positif : largeur = 1080 px des deux côtés (référence et capture, ×3,6 sur 300 CSS)."""
import commun as C

print('== m0 : couche globale ==')
ims = {k: C.ouvrir(k) for k in ['reference', 'capture', 'canon2', 'vide2', 'hud']}
print()

print('-- CONTRÔLE POSITIF : largeur --')
print('   reference %d px, capture %d px  -> egales ? %s' %
      (ims['reference'].size[0], ims['capture'].size[0],
       ims['reference'].size[0] == ims['capture'].size[0]))
print('   canon2 %d px (x3,0 sur 300 CSS)  -> rapport capture/canon2 = %.3f (attendu 1,200)' %
      (ims['canon2'].size[0], ims['capture'].size[0] / ims['canon2'].size[0]))
print()

for k, im in ims.items():
    W, H = im.size
    px = im.load()
    tot = 0; n = 0; encre = 0
    pas = 3
    for y in range(0, H, pas):
        for x in range(0, W, pas):
            r, g, b = px[x, y]
            l = (r * 299 + g * 587 + b * 114) // 1000
            tot += l; n += 1
            if l > 60:
                encre += 1
    print('%-10s %sx%s  luminance moyenne (0-255) = %5.1f   densite encre (L>60) = %5.2f %%'
          % (k, W, H, tot / n, 100.0 * encre / n))
    for c, p in C.palette(im, 6)[:6]:
        print('              %-9s %5.2f %%' % (C.hx(c), p))
    print()
