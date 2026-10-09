#!/usr/bin/env python3
"""P11 (v2) — police de la fiche de E04 ㉘ : famille (indice d'empattement), taille (hauteur de
capitale), sur des fenetres PRISES A L'INTERIEUR de la fiche creme (fond median = creme, verifie).

La v1 est ECARTEE : sa fenetre debordait du carton sur le liege, le fond median n'etait plus le
creme et toute la fiche passait pour de l'encre (une seule bande au lieu de deux).

INDICE D'EMPATTEMENT = mediane des segments horizontaux d'encre sur les 3 rangees au-dessus de la
ligne de base / mediane au milieu de la bande d'x. Sans empattement ~1 ; avec pied ~> 1,3.
Echelle : 1 px CSS = 3,6 px image des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def fiche(kind, nom, box, gap):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H, gap=gap)
    print(f"   {nom}  fenetre={box}  fond median={f} (creme attendu)  bandes={[(box[1]+a, box[1]+b) for a, b in bs]}")
    out = []
    for a, b in bs:
        if b - a < 8:
            continue
        m = metrique(bits, W, a, b)
        if not m:
            continue
        base, xline = m['base'], m['xline']
        gp, _ = graisse(bits, W, base - 2, base, 0, W - 1)
        mid = (base + xline) // 2
        gm, _ = graisse(bits, W, mid - 1, mid + 1, 0, W - 1)
        ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 2]
        ec = sorted(ls[j + 1][0] - ls[j][1] for j in range(len(ls) - 1))
        ec = [e for e in ec if e < 40]
        cx = box[0] + (m['x0'] + m['x1']) // 2
        print(f"      y={box[1]+a:4d}..{box[1]+b:4d}  capH={m['capH']:2d}px ({m['capH']/K:4.2f} css) "
              f"xH={m['xH']:2d}px  fut={m['trait']}px  pied={gp}px mid={gm}px  "
              f"INDICE={gp/gm:4.2f}  encre x={box[0]+m['x0']}..{box[0]+m['x1']} centre={cx} "
              f"interlettre med={ec[len(ec)//2] if ec else '-'}px")
        out.append((m, gp / gm, cx))
    return out

print("=== P11 v2 — la fiche de E04 ㉘ ===")
print("-- REFERENCE cadre 54 : bande 1 = titre de fiche, bande 2 = label « D'OU CA PART » --")
r = fiche("ref", "E04-cadre-54", (100, 700, 640, 805), 4)
print("-- CAPTURE 2400 --")
c = fiche("cap", "E04_Distribution_1080x2400", (200, 795, 880, 900), 2)
print("-- CAPTURE 1920 --")
c2 = fiche("cap", "E04_Distribution_1080x1920", (200, 695, 880, 800), 2)

print()
print("=== CONTROLE POSITIF : dans la SEULE reference, l'indice doit separer les 2 lignes ===")
if len(r) >= 2:
    print(f"   titre (lu serif a l'image) indice={r[0][1]:.2f}   label (lu sans) indice={r[1][1]:.2f}  -> "
          + ("SEPARE" if r[0][1] - r[1][1] > 0.25 else "NE SEPARE PAS"))
print()
print("=== CONTROLE NEGATIF : indice sur un sous-titre SANS connu (E03 ref, DejaVu Sans) ===")
im = ouvrir("ref", "E03-cadre-48")
W, H, bits, f = masque(im, (40, 530, 1040, 580))
bs, _ = bandes(bits, W, H)
a, b = bs[0]
m = metrique(bits, W, a, b)
gp, _ = graisse(bits, W, m['base'] - 2, m['base'], 0, W - 1)
mid = (m['base'] + m['xline']) // 2
gm, _ = graisse(bits, W, mid - 1, mid + 1, 0, W - 1)
print(f"   E03 sous-titre (DejaVu Sans) indice={gp/gm:.2f}  (attendu ~1,0)")
im = ouvrir("ref", "E03-cadre-48")
W, H, bits, f = masque(im, (40, 465, 1040, 530))
bs, _ = bandes(bits, W, H)
a, b = bs[0]
m = metrique(bits, W, a, b)
gp, _ = graisse(bits, W, m['base'] - 2, m['base'], 0, W - 1)
mid = (m['base'] + m['xline']) // 2
gm, _ = graisse(bits, W, mid - 1, mid + 1, 0, W - 1)
print(f"   E03 titre      (DejaVu Serif Bold) indice={gp/gm:.2f}  (attendu > 1,3)")
