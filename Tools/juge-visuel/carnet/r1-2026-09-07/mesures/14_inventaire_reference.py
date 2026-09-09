# -*- coding: utf-8 -*-
"""Inventaire geometrique de la REFERENCE (cadre #85), en px et en CSS (x3,6 ; 300 CSS = 1080 px).
Controle POSITIF : la CSS annonce .cn-page padding 9/10/10 et .cn-slot height 26px, la reglure
tous les 26 px CSS -> on doit retrouver 26 x 3,6 = 93,6 px entre deux traits."""
from lib_mes import *

REF = ouvrir('../reference-1080x2102.png'); P = REF.load()
K = 1080/300.0
print('   echelle reference : %.2f px/CSS' % K)
print()

def creme(c):
    return abs(c[0]-0xef) <= 14 and abs(c[1]-0xe7) <= 14 and abs(c[2]-0xd6) <= 14

print('--- page du carnet (.cn-page, aplat creme) ---')
b = bbox(REF, creme, 0, 400, 1080, 1700)
print('   bbox=(%d,%d,%d,%d)  larg=%d px = %.1f CSS  haut=%d px = %.1f CSS' % (
    b[0], b[1], b[2], b[3], b[2]-b[0]+1, (b[2]-b[0]+1)/K, b[3]-b[1]+1, (b[3]-b[1]+1)/K))
print('   marge gauche=%.1f CSS  marge droite=%.1f CSS' % (b[0]/K, (1079-b[2])/K))
print('   couleur au centre (mediane 9x9) = %s' % (mediane_fenetre(REF, (b[0]+b[2])//2, b[1]+40, 4),))
print()

print('--- reglure (.cn-page background-image, trait tous les 26 px CSS) ---')
def regle(c):
    return abs(c[0]-0xcb) <= 16 and abs(c[1]-0xbf) <= 16 and abs(c[2]-0xa4) <= 16
seg = profil_lignes(REF, b[0]+30, b[2]-30, regle, b[1], b[3])
ys = [ (s[0]+s[1])/2.0 for s in seg if s[1]-s[0] <= 4 ]
print('   %d traits ; y = %s' % (len(ys), ['%.1f' % y for y in ys]))
if len(ys) > 2:
    ecarts = [ys[i+1]-ys[i] for i in range(len(ys)-1)]
    print('   ecarts px = %s' % ['%.1f' % e for e in ecarts])
    m = sum(ecarts)/len(ecarts)
    print('   ecart moyen = %.2f px = %.2f CSS   (CSS annoncee : 26,0)' % (m, m/K))
print()

print('--- pastilles de numero (.cn-slot .no, 15 px CSS de diametre) ---')
def noir_pastille(c):
    return abs(c[0]-0x2a) <= 14 and abs(c[1]-0x21) <= 14 and abs(c[2]-0x18) <= 14
segn = profil_lignes(REF, b[0]+10, b[0]+90, noir_pastille, b[1], b[3])
print('   %d pastilles sombres ; blocs y = %s' % (len(segn), segn))
for s in segn[:6]:
    bb = bbox(REF, noir_pastille, b[0]+10, s[0], b[0]+90, s[1]+1)
    print('        y=%d..%d  x=%d..%d  D=%d px = %.2f CSS' % (s[0], s[1], bb[0], bb[2], bb[2]-bb[0]+1, (bb[2]-bb[0]+1)/K))
print()

print('--- pied (.cn-bas) : bloc bleu nuit en bas ---')
def bleubas(c):
    return abs(c[0]-0x14) <= 10 and abs(c[1]-0x1a) <= 10 and abs(c[2]-0x21) <= 10
bb = bbox(REF, bleubas, 0, 1600, 1080, 2102)
print('   bbox=%s  haut=%d px = %.1f CSS  ; couleur CSS annoncee #141a21' % (bb[:4], bb[3]-bb[1]+1, (bb[3]-bb[1]+1)/K))
print('   mediane a (540,%d) = %s' % (bb[1]+20, mediane_fenetre(REF, 540, bb[1]+20, 4)))
print()

print('--- bouton LANCER LA SOIREE (.cn-geste) ---')
def bordor(c):
    r,g,b2 = c
    return 120 < r < 245 and 0.55*r < g < 0.90*r and b2 < 0.75*g
bb = bbox(REF, bordor, 0, 1900, 1080, 2102)
print('   encre or bbox=%s  larg=%.1f CSS  haut=%.1f CSS' % (bb[:4], (bb[2]-bb[0]+1)/K, (bb[3]-bb[1]+1)/K))
print()

print('--- couche globale : palette dominante (quantifiee) ---')
for nom, chemin, zone in [('REFERENCE (ecran entier)', '../reference-1080x2102.png', None),
                          ('REFERENCE (zone contenu 434..1780)', '../reference-1080x2102.png', (0,434,1080,1780)),
                          ('CAPTURE (zone contenu 143..2151)', '../capture-1080x2400.png', (0,143,1080,2151))]:
    im = Image.open(chemin).convert('RGB')
    if zone: im = im.crop(zone)
    q = im.resize((im.size[0]//4, im.size[1]//4)).quantize(colors=6, method=Image.MEDIANCUT).convert('RGB')
    cols = sorted(q.getcolors(10**7), reverse=True)
    tot = sum(c for c, _ in cols)
    print('   %s  taille=%s' % (nom, im.size))
    for c, rgb in cols[:6]:
        print('        %-16s %5.1f %%' % (str(rgb), 100.0*c/tot))
    lm = 0; n = 0
    p = im.load()
    for y in range(0, im.size[1], 3):
        for x in range(0, im.size[0], 3):
            lm += lum(p[x, y]); n += 1
    print('        luminance moyenne = %.1f' % (lm/n))
