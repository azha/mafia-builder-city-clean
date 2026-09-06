"""m22 — verification que chaque ASSUME est RENDU PROPREMENT (perimetre du dossier).
A1 tiret ENFREINTES : couleur et position par rapport aux deux chiffres.
A2 col : remplissage aire/boite (triangle ~0,43 · rectangle ~0,9), centrage sur l'axe du
   buste, et non-recouvrement du cou.
A3 reflet : position dans le tiers HAUT du panneau elastique.
A4 nom du lieutenant projete / mention « non projete » absente.
A5 pas de place reservee vide pour les gages.
"""
import sys, collections; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

REF = ouvrir('../reference-1080x2102.png'); J = ouvrir('../capture-1080x2400.png')

def bbox(im, x0, y0, x1, y1, frac=0.55):
    px = im.load()
    vals = [lum(px[x, y]) for y in range(y0, y1+1) for x in range(x0, x1+1)]
    lo = sorted(vals)[len(vals)//10]; hi = sorted(vals)[int(len(vals)*0.997)]
    s = lo + frac*(hi-lo)
    E = [(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1) if lum(px[x, y]) >= s]
    if not E: return None
    xs = [p[0] for p in E]; ys = [p[1] for p in E]
    cm = tuple(int(round(mediane([px[x, y][i] for x, y in E]))) for i in range(3))
    return (min(xs), min(ys), max(xs), max(ys), len(E), cm)

print("\n== A1 : le tiret ENFREINTES vs les deux chiffres (JEU) ==")
for nm, x0, x1 in [('compteur 1 (00)', 60, 350), ('compteur 2 (00)', 397, 640), ('compteur 3 (tiret)', 730, 1020)]:
    b = bbox(J, x0, 745, x1, 795)
    if b: print(f"   {nm:22s} bbox x{b[0]}..{b[2]} y{b[1]}..{b[3]}  n={b[4]:5d}  couleur {b[5]}"
                f"  centre x={(b[0]+b[2])/2:.1f} y={(b[1]+b[3])/2:.1f}")
print("   boites : c1 x49..357 (centre 203,0) · c2 x386..693 (centre 539,5) · c3 x722..1030 (centre 876,0)")

print("\n== A2 : le col (triangle creme) ==")
for nom, im, y0, y1 in [('REF', REF, 1250, 1330), ('JEU', J, 1280, 1370)]:
    px = im.load()
    E = [(x, y) for y in range(y0, y1+1) for x in range(150, 440)
         if abs(px[x, y][0]-234) < 30 and abs(px[x, y][1]-224) < 30 and abs(px[x, y][2]-200) < 40]
    if not E: print(f"   {nom} : rien"); continue
    xs = [p[0] for p in E]; ys = [p[1] for p in E]
    w = max(xs)-min(xs)+1; h = max(ys)-min(ys)+1
    print(f"   {nom} : boite {w}x{h}  aire={len(E)}  remplissage aire/boite = {len(E)/(w*h):.3f}"
          f"  centre x = {(min(xs)+max(xs))/2:.1f}")

print("\n== A3 : le reflet (ligne cyan) dans le panneau elastique ==")
print("   REF : y1083 dans le panneau 848..1613 -> 30.7 % ;"
      " JEU2400 : y1104 dans 874..1550 -> 33.9 %  (tiers haut des deux cotes)")

print("\n== A4 : le libelle de la carte ==")
for nom, im, y0, y1 in [('REF', REF, 900, 970), ('JEU', J, 925, 990)]:
    b = bbox(im, 100, y0, 490, y1, 0.5)
    print(f"   {nom} bande du libelle : {b[:4] if b else None}")
print("   REF porte en plus la mention « lieutenant.name — non projete (L0.4) » (m19 : bande")
print("   off/bloc 629..645 du panneau elastique) ; le JEU n'a AUCUNE bande a cet offset.")

print("\n== A5 : y a-t-il une place reservee vide (section gages) ? ==")
px = J.load()
vide = 0
for y in range(1411, 1548):
    ref = mediane([lum(px[x, y]) for x in range(528, 1035)])
    n = sum(1 for x in range(528, 1035) if lum(px[x, y]) > ref + 12)
    if n > 5: vide += 1
print(f"   JEU : sous la 4e tuile (y1411..1547, colonne droite) : {vide} rangees portant de l'encre")
