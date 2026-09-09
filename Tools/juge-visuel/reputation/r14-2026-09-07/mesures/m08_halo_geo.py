"""m08 — LE HALO : profil de Chebyshev CORRIGE du fond, et GEOMETRIE du halo.

Correction de fond (necessaire, et c'est un fait mesure) : la boite de compteur de la
REFERENCE porte un degrade vertical (mediane de rangee 21,7 en haut -> 13,6 au milieu ->
20,9 en bas, diag_fond.py) tandis que celle du JEU est un APLAT a 13,65 partout. Un
"fond" global unique fabrique donc un exces de +2 pts a d20..d30 cote reference qui n'est
pas du halo mais le degrade. Fond retenu : le 10e PERCENTILE DE CHAQUE RANGEE de la boite
(robuste a l'encre et au halo, verifie egal au minimum de la rangee sur les rangees vides).

exces(x,y) = lum(x,y) - p10(rangee y).
encre      = lum >= p10_median + 0,50*(P99,5 - p10_median).
coquille d = px non-encre a distance de Chebyshev d de l'encre ; exces(d) = moyenne.

GEOMETRIE (la question que le profil radial ne pose pas) :
  - barycentre de l'ENCRE (pondere 1) et barycentre du HALO (px non-encre ponderes par
    l'exces, exces > 1 pt). Un halo de glyphe a le meme barycentre que son glyphe ;
    un disque pose derriere ne l'a pas.
  - etendue du halo a mi-hauteur en x et en y, comparee a l'etendue de l'encre.
CONTROLE POSITIF : cote REFERENCE, le barycentre du halo doit coller a celui de l'encre
  (a quelques px) — c'est une ombre de texte. Si mon instrument dit le contraire sur la
  reference, il est faux.
"""
import sys, math, collections; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste

BOITES = {
 'REF':    ('../reference-1080x2102.png', 702, 815, [(50,361),(384,695),(718,1029)]),
 'JEU2400':('../capture-1080x2400.png',   728, 840, [(49,357),(386,693),(722,1030)]),
}
NOMS = ['1 REGLES DONNEES', '2 ABSORBEES', '3 ENFREINTES']
ER = 8

def travaille(im, y0, y1, x0, x1, etiq):
    px = im.load(); Y0, Y1, X0, X1 = y0+ER, y1-ER, x0+ER, x1-ER
    p10 = {}
    for y in range(Y0, Y1+1):
        v = sorted(lum(px[x, y]) for x in range(X0, X1+1))
        p10[y] = v[len(v)//10]
    tous = [lum(px[x, y]) for y in range(Y0, Y1+1) for x in range(X0, X1+1)]
    P995 = sorted(tous)[int(0.995*len(tous))]
    base = mediane(list(p10.values()))
    seuil = base + 0.50*(P995 - base)
    E = {(x, y) for y in range(Y0, Y1+1) for x in range(X0, X1+1) if lum(px[x, y]) >= seuil}
    print(f"\n--- {etiq}  boite x{X0}..{X1} y{Y0}..{Y1} · base={base:.2f} P99,5={P995:.1f}"
          f" seuil encre={seuil:.1f} · encre={len(E)} px ---")
    # coquilles
    dist = {}; dq = collections.deque()
    for p in E: dist[p] = 0; dq.append(p)
    while dq:
        x, y = dq.popleft(); d = dist[(x, y)]
        if d >= 34: continue
        for dx in (-1,0,1):
            for dy in (-1,0,1):
                q = (x+dx, y+dy)
                if X0 <= q[0] <= X1 and Y0 <= q[1] <= Y1 and q not in dist:
                    dist[q] = d+1; dq.append(q)
    pd = {}
    for (x, y), d in dist.items():
        if d: pd.setdefault(d, []).append(lum(px[x, y]) - p10[y])
    ex = {}
    for d in [2,4,6,8,10,12,14,16,18,20,22,26,30]:
        if d in pd:
            ex[d] = sum(pd[d])/len(pd[d])
            print(f"      d={d:2d}  n={len(pd[d]):5d}  exces={ex[d]:+6.2f}")
    # geometrie
    sx = sy = sw = 0.0
    for (x, y) in E: sx += x; sy += y; sw += 1
    cE = (sx/sw, sy/sw)
    hx = hy = hw = 0.0
    halo = []
    for (x, y), d in dist.items():
        if d == 0: continue
        v = lum(px[x, y]) - p10[y]
        if v > 1.0:
            hx += x*v; hy += y*v; hw += v; halo.append((x, y, v))
    if hw > 0:
        cH = (hx/hw, hy/hw)
        print(f"   barycentre ENCRE = ({cE[0]:.1f}, {cE[1]:.1f})   barycentre HALO = ({cH[0]:.1f}, {cH[1]:.1f})"
              f"   ECART = ({cH[0]-cE[0]:+.1f}, {cH[1]-cE[1]:+.1f}) px")
        print(f"   halo : {len(halo)} px > 1 pt · lumiere totale = {hw:.0f} pts·px")
        # etendue a mi-hauteur du halo
        vmax = max(v for _,_,v in halo)
        forts = [(x, y) for x, y, v in halo if v >= vmax/2]
        if forts:
            xs = [p[0] for p in forts]; ys = [p[1] for p in forts]
            print(f"   halo a mi-hauteur (>= {vmax/2:.1f} pts) : x{min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1})"
                  f"  y{min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})  n={len(forts)}")
        exs = [p[0] for p in E]; eys = [p[1] for p in E]
        print(f"   encre : x{min(exs)}..{max(exs)} (l={max(exs)-min(exs)+1})"
              f"  y{min(eys)}..{max(eys)} (h={max(eys)-min(eys)+1})")
    return ex

R = {}
for k, (f, y0, y1, xs) in BOITES.items():
    im = ouvrir(f); R[k] = []
    for i, (a, b) in enumerate(xs):
        R[k].append(travaille(im, y0, y1, a, b, f"{k} · compteur {NOMS[i]}"))

ds = [2,4,6,8,10,12,14,16,18,20,22,26,30]
for c in range(3):
    print(f"\n===== compteur {NOMS[c]} : exces par distance, fond par rangee =====")
    print("| d | " + " | ".join(str(d) for d in ds) + " |")
    print("| ref | " + " | ".join(f"{R['REF'][c].get(d, float('nan')):+.1f}" for d in ds) + " |")
    print("| jeu | " + " | ".join(f"{R['JEU2400'][c].get(d, float('nan')):+.1f}" for d in ds) + " |")
    print("| jeu/ref | " + " | ".join(
        f"{R['JEU2400'][c][d]/R['REF'][c][d]:.2f}" if R['REF'][c].get(d,0) > 0.05 and d in R['JEU2400'][c] else "-"
        for d in ds) + " |")
