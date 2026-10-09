#!/usr/bin/env python3
"""P11 — E04 ㉘ : police de la fiche « D'OU CA PART » (famille, taille) + rangees « LE CHEMIN... ».

INDICE D'EMPATTEMENT (instrument neuf) : une serif pose un pied large au bas du fut.
  indice = mediane des segments horizontaux d'encre sur les 3 rangees au-dessus de la ligne de base
         / mediane des segments horizontaux d'encre au milieu de la bande d'x
  DejaVu Serif  -> indice nettement > 1   ;  DejaVu Sans -> indice ~ 1
Controle positif : la ligne « D'OU CA PART » de la REFERENCE est en sans (lue a l'image) -> ~1 ;
                   le titre de fiche de la REFERENCE est en serif -> > 1,4. L'instrument doit
                   separer ces deux lignes d'une MEME image.
Taille : hauteur de capitale (toutes les lettres de « D'OU CA PART » sont des capitales).
Echelle : 1 px CSS = 3,6 px image des deux cotes.
"""
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from metrique import *

def empattement(bits, W, a, b):
    m = metrique(bits, W, a, b)
    if not m:
        return None, None
    base, xline = m['base'], m['xline']
    g_pied, n1 = graisse(bits, W, base - 2, base, 0, W - 1)
    mid = (base + xline) // 2
    g_mid, n2 = graisse(bits, W, mid - 1, mid + 1, 0, W - 1)
    return (g_pied / float(g_mid) if g_mid else None), dict(m=m, pied=g_pied, mid=g_mid, n1=n1, n2=n2)

def analyse(kind, nom, box, etqs):
    im = ouvrir(kind, nom)
    W, H, bits, f = masque(im, box)
    bs, _ = bandes(bits, W, H)
    print(f"   {nom} fenetre={box} bandes={[(box[1]+a, box[1]+b) for a, b in bs]}")
    out = {}
    for etq, i in etqs:
        if i >= len(bs):
            print(f"      {etq}: BANDE ABSENTE")
            continue
        a, b = bs[i]
        ind, d = empattement(bits, W, a, b)
        m = d['m']
        # interlettrage : ecart moyen entre debuts de lettres successives
        ls = [l for l in lettres(bits, W, a, b) if l[1] - l[0] + 1 >= 2]
        ecarts = [ls[j + 1][0] - ls[j][1] for j in range(len(ls) - 1)]
        ecarts = [e for e in ecarts if e < 30]
        print(f"      {etq:12s} y={box[1]+a}..{box[1]+b}  capH={m['capH']}px ({m['capH']/K:.2f} css) "
              f"xH={m['xH']}px  fut={m['trait']}px  pied={d['pied']}px mid={d['mid']}px "
              f"INDICE EMPATTEMENT={ind:.2f}  encre x={box[0]+m['x0']}..{box[0]+m['x1']} "
              f"(centre {box[0]+(m['x0']+m['x1'])//2})  interlettre median="
              f"{sorted(ecarts)[len(ecarts)//2] if ecarts else '-'}px")
        out[etq] = (ind, m)
    return out

print("=== P11 : la fiche de E04 ㉘ ===")
print("--- REFERENCE cadre 54 : fiche 1 (titre serif gras + label sans) ---")
r = analyse("ref", "E04-cadre-54", (60, 690, 1000, 800), [("titre fiche", 0), ("D'OU CA PART", 1)])
print("--- CAPTURE 2400 : la fiche de l'etat « aucun relais » ---")
c = analyse("cap", "E04_Distribution_1080x2400", (60, 790, 1020, 900), [("titre fiche", 0), ("D'OU CA PART", 1)])
print("--- CAPTURE 1920 ---")
c2 = analyse("cap", "E04_Distribution_1080x1920", (60, 690, 1020, 800), [("titre fiche", 0), ("D'OU CA PART", 1)])

print()
print("=== CONTROLE POSITIF : l'instrument separe-t-il serif et sans DANS LA MEME image ? ===")
LAB = "D'OU CA PART"
it, il = r['titre fiche'][0], r[LAB][0]
print("   reference : indice titre = %.2f   indice label = %.2f   -> %s"
      % (it, il, "SEPARE serif / sans" if it > il + 0.3 else "NE SEPARE PAS"))
print("   capture   : indice titre = %.2f   indice label = %.2f" % (c['titre fiche'][0], c[LAB][0]))

print()
print("=== RANGEES « LE CHEMIN / A TRAVERSER / CETTE ROUTE » ===")
im = ouvrir("ref", "E04-cadre-54")
W, H, bits, f = masque(im, (40, 1430, 1040, 1700))
bs, _ = bandes(bits, W, H)
print("   reference cadre 54, sous la planche : bandes =", [(1430 + a, 1430 + b) for a, b in bs])
im = ouvrir("cap", "E04_Distribution_1080x2400")
W, H, bits, f = masque(im, (40, 1180, 1040, 1500))
bs, _ = bandes(bits, W, H)
print("   capture 2400, sous la planche      : bandes =", [(1180 + a, 1180 + b) for a, b in bs])
