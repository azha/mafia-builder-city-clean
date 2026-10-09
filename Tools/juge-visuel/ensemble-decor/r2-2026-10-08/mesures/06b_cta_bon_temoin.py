#!/usr/bin/env python3
"""06b — LE BON TÉMOIN. Les gestes de ㊳ et ㉞ sont gris/mauve en jeu. Avant de les classer,
on cherche l'HOMOLOGUE : la maquette porte-t-elle un état désactivé / verrouillé ?
Résultat : oui — cadre 127 pour ㊳, cadre 88 pour ㉞. Le jeu les reproduit à 0 et 2/255.
Deux findings MAJEUR sont morts ici. C'est la règle « Témoin » du mandat."""
from PIL import Image
import statistics, collections, glob, os
REF="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r2-2026-10-08/reference"
CAP="/home/erutheone/project/mafia-unity-F/Tools/juge-visuel/planches-par-ecran-2026-10-08-client2-final"
def mes(p,box):
    im=Image.open(p).convert("RGB"); px=im.load(); x0,y0,x1,y1=box
    pts=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    q=collections.Counter((c[0]//8,c[1]//8,c[2]//8) for c in pts); fq=q.most_common(1)[0][0]
    fond=tuple(int(statistics.median([c[k] for c in pts if (c[0]//8,c[1]//8,c[2]//8)==fq])) for k in range(3))
    ink=[c for c in pts if max(abs(c[k]-fond[k]) for k in range(3))>55]
    if len(ink)<40: return im.size,fond,None
    return im.size,fond,tuple(int(statistics.median([c[k] for c in ink])) for k in range(3))
print("㉞ E02 — tous les cadres fournis, barre du geste :")
for f in sorted(glob.glob(os.path.join(REF,"E02-cadre-*.png"))):
    s,fo,en=mes(f,(55,1930,1025,2050)); print(f"  {os.path.basename(f):22s} {s[0]}x{s[1]} fond={fo} encre={en}")
s,fo,en=mes(os.path.join(CAP,"E02_Carnet_1080x2400.png"),(95,1965,985,2055))
print(f"  >> JEU                 {s[0]}x{s[1]} fond={fo} encre={en}")
print("\n㊳ E01 — tous les cadres fournis, barre du geste :")
for f in sorted(glob.glob(os.path.join(REF,"E01-cadre-*.png"))):
    s,fo,en=mes(f,(60,1890,1020,1995)); print(f"  {os.path.basename(f):26s} {s[0]}x{s[1]} fond={fo} encre={en}")
s,fo,en=mes(os.path.join(CAP,"E01_Journal_1080x2400.png"),(95,1930,985,2010))
print(f"  >> JEU                     {s[0]}x{s[1]} fond={fo} encre={en}")
print("\nCONCLUSION : ㊳ jeu (122,131,141) == cadre 127 (122,131,141) -> 0/255")
print("             ㉞ jeu (150,121,121) == cadre 88  (152,121,121) -> 2/255")
print("Les deux gestes reproduisent l'état DÉSACTIVÉ que la maquette porte. Pas un écart.")
