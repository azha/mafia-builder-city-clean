# -*- coding: utf-8 -*-
"""m10 — detail glyphe par glyphe (le max etait un artefact : deux glyphes fusionnes ou un accent).
Regle retenue : sur un texte TOUT EN CAPITALES la hauteur de capitale est la MEDIANE des glyphes
larges (>=4 px) ; le max peut fusionner deux lettres. On imprime tout pour que ce soit opposable.
Contrôle positif : titre 'LES INSPECTIONS' (11 a 14 glyphes attendus) -> mediane == max a 1 px pres.
"""
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
def ouvrir(rel):
    im = Image.open(os.path.join(D, rel)).convert('RGB')
    print("OUVERT %-30s taille=%s" % (rel, im.size)); return im
def glyphes(im, x0, y0, x1, y1, seuil, minw=3):
    g = im.convert('L'); px = g.load()
    cols = [any(px[x, y] > seuil for y in range(y0, y1+1)) for x in range(x0, x1+1)]
    seg = []; cur = None
    for i, v in enumerate(cols):
        x = x0+i
        if v:
            cur = [x, x] if cur is None else [cur[0], x]
        else:
            if cur is not None: seg.append(tuple(cur)); cur = None
    if cur is not None: seg.append(tuple(cur))
    out = []
    for a, b in seg:
        ys = [y for y in range(y0, y1+1) if any(px[x, y] > seuil for x in range(a, b+1))]
        if ys and (b-a+1) >= minw: out.append((a, b, b-a+1, min(ys), max(ys), max(ys)-min(ys)+1))
    return out
def med(v):
    v = sorted(v); n = len(v); return v[n//2] if n % 2 else (v[n//2-1]+v[n//2])/2.0

cap = ouvrir('capture-1080x2400.png'); can = ouvrir('etats/inspections-canon.png')
print()
def detail(nom, im, box, seuil, ech):
    gl = glyphes(im, box[0], box[1], box[2], box[3], seuil)
    print("-- %s (%d glyphes, echelle x%.1f)" % (nom, len(gl), ech))
    print("   " + "  ".join("%d..%d/h%d" % (a, b, h) for a, b, w, y0, y1, h in gl))
    hs = [h for *_, h in gl]
    print("   mediane h = %.1f px = %.2f CSS ; max = %d px = %.2f CSS" % (med(hs), med(hs)/ech, max(hs), max(hs)/ech))
    return med(hs)/ech

tc = detail('CAP titre',            cap, (396, 268, 828, 303), 45, 3.6)
tn = detail('CAN titre',            can, (150,  60, 640, 100), 46, 3.0)
sc = detail('CAP sous-titre l1 maj?',cap,(338, 344, 740, 368), 45, 3.6)
sn = detail('CAN sous-titre l1 MAJ',can, (145, 120, 520, 156), 40, 3.0)
hc = detail('CAP entete PAR GRAVITE',cap,( 38, 457, 239, 482), 40, 3.6)
hn = detail('CAN libelle GRAVITE',  can, ( 70, 385, 205, 420), 40, 3.0)
vc = detail('CAP valeur None',      cap, (491, 515, 553, 545), 40, 3.6)
vn = detail('CAN chip MOYENNE',     can, (275, 390, 430, 425), 40, 3.0)
print()
print("CONTROLE POSITIF titres : mediane==max a 1 px pres ?  capture %s   canon %s"
      % (abs(med([h for *_, h in glyphes(cap,396,268,828,303,45)]) - max(h for *_, h in glyphes(cap,396,268,828,303,45))) <= 1,
         abs(med([h for *_, h in glyphes(can,150,60,640,100,46)]) - max(h for *_, h in glyphes(can,150,60,640,100,46))) <= 1))
print()
print("== SYNTHESE hauteur de capitale (CSS) ==")
print("  titre           capture %.2f  canon %.2f  -> %+.1f %%" % (tc, tn, 100*(tc-tn)/tn))
print("  sous-titre      capture %.2f  canon %.2f  -> %+.1f %%" % (sc, sn, 100*(sc-sn)/sn))
print("  entete/libelle  capture %.2f  canon %.2f  -> %+.1f %%" % (hc, hn, 100*(hc-hn)/hn))
print("  valeur/chip     capture %.2f  canon %.2f  -> %+.1f %%" % (vc, vn, 100*(vc-vn)/vn))
