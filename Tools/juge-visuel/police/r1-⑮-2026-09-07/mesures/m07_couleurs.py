# -*- coding: utf-8 -*-
"""m07 — couleurs : echantillon = MEDIANE des pixels les plus clairs d'une boite (encre de texte),
ou mediane d'une fenetre (aplat). Comparaison aux jetons de la source de serie 2.
Contrôle positif : le fond de la capture et celui du canon doivent tous deux etre a moins de 12/255
                   du jeton --encre #0b1016 (11,16,22) — meme famille, aucun ecart a declarer.
Contrôle negatif : le titre (or) doit differer du fond de plus de 60/255 sur R.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im

JETONS = {'--encre':(11,16,22), '--creme':(234,224,200), '--creme-2':(185,173,146),
          '--or':(217,171,78), '--or-vif':(242,201,107), '--laiton':(176,141,62),
          '--braise':(224,102,74), '--cyan':(127,212,217), '--vert':(125,179,106)}

def med(vals):
    v = sorted(vals); n = len(v)
    return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])//2

def encre(im, x0, y0, x1, y1, frac=0.10):
    """mediane RGB des 'frac' pixels les plus lumineux de la boite = la couleur de l'encre."""
    px = im.load(); pts = []
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            r, g, b = px[x, y]; pts.append((0.299*r+0.587*g+0.114*b, r, g, b))
    pts.sort(reverse=True); k = max(3, int(len(pts)*frac)); top = pts[:k]
    return (med([p[1] for p in top]), med([p[2] for p in top]), med([p[3] for p in top]))

def aplat(im, x0, y0, x1, y1):
    px = im.load(); R=[];G=[];B=[]
    for y in range(y0, y1+1):
        for x in range(x0, x1+1):
            r, g, b = px[x, y]; R.append(r); G.append(g); B.append(b)
    return (med(R), med(G), med(B))

def proche(c):
    best = None
    for n, t in JETONS.items():
        d = max(abs(c[i]-t[i]) for i in range(3))
        if best is None or d < best[1]: best = (n, d)
    return best

cap = ouvrir('capture-1080x2400.png')
can = ouvrir('etats/inspections-canon.png')
print()
fk = aplat(cap, 700, 1300, 1000, 1500); fc = aplat(can, 700, 1150, 860, 1190)
print("CONTROLE POSITIF fond capture=%s  fond canon=%s  jeton --encre=(11,16,22)" % (fk, fc))
print("   ecart max capture/--encre = %d ; canon/--encre = %d" %
      (max(abs(fk[i]-JETONS['--encre'][i]) for i in range(3)),
       max(abs(fc[i]-JETONS['--encre'][i]) for i in range(3))))
tk = encre(cap, 396, 268, 828, 303)
print("CONTROLE NEGATIF titre capture=%s vs fond %s -> delta R = %d (attendu >60)" % (tk, fk, tk[0]-fk[0]))
print()

MESURES_CAP = [
 ('titre LES INSPECTIONS', 396, 268, 828, 303),
 ('sous-titre "district district-1"', 338, 344, 585, 368),
 ('sous-titre "Nominal"', 620, 344, 740, 368),
 ('libelle Charge', 37, 404, 143, 435),
 ('entete PAR GRAVITE', 38, 457, 239, 482),
 ('libelle Critique (None)', 37, 515, 154, 545),
 ('libelle Faible (Predominant)', 38, 687, 122, 712),
 ('libelle Programmee (Predom.)', 38, 796, 230, 827),
 ('valeur None (Critique)', 491, 515, 553, 545),
 ('valeur Predominant (Faible)', 491, 687, 648, 712),
 ('valeur Moderate (Charge)', 674, 404, 789, 435),
 ('jauge Charge segment allume', 427, 404, 470, 435),
 ('jauge Charge segment eteint', 570, 404, 652, 435),
 ('jauge Critique (None) 3 seg', 284, 515, 470, 545),
 ('jauge Faible (Predom.) 3 seg', 284, 687, 470, 712),
]
print("== CAPTURE ==")
for nom, x0, y0, x1, y1 in MESURES_CAP:
    c = encre(cap, x0, y0, x1, y1); n, d = proche(c)
    print("  %-32s RGB=%-16s  jeton le plus proche %-10s ecart=%d" % (nom, str(c), n, d))

MESURES_CAN = [
 ('titre LES INSPECTIONS', 152, 64, 628, 97),
 ('sous-titre l1', 149, 125, 504, 152),
 ('nom de district Verge-A', 72, 285, 203, 345),
 ('chip CHARGE MODEREE (texte)', 250, 300, 520, 335),
 ('chip REGIME ARRIERE (texte)', 565, 300, 815, 335),
 ('libelle GRAVITE', 72, 385, 200, 415),
 ('chip MOYENNE DOMINANTE', 275, 390, 430, 460),
 ('chip FAIBLE BEAUCOUP', 465, 390, 610, 460),
 ('chip FORENSIQUES (braise)', 465, 520, 625, 610),
 ('bandeau vide (texte)', 81, 1244, 817, 1328),
 ('CTA titre', 100, 1490, 800, 1560),
]
print()
print("== CANON SERIE 2 (garni) ==")
for nom, x0, y0, x1, y1 in MESURES_CAN:
    c = encre(can, x0, y0, x1, y1); n, d = proche(c)
    print("  %-32s RGB=%-16s  jeton le plus proche %-10s ecart=%d" % (nom, str(c), n, d))
