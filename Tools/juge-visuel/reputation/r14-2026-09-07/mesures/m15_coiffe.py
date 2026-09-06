"""m15 (v3) — LA COIFFE. v1 prenait pour "sombre" TOUS les seaux d'histogramme proches du
fond (jusqu'a 6 seaux) : le fond de la carte lui-meme etait classe sombre et l'epaisseur
laterale rendait 157 px cote reference. Correction : les nominaux sont les seuls seaux
MASSIFS (> 5 000 px), qui sont les vraies matieres ; les seaux de queue sont du degrade.

Nominaux retenus (imprimes) : fond de carte · coiffe · contour · peau · creme.
SOMBRE = {coiffe, contour}. Rangees de la ligne cyan EXCLUES (intervalle imprime).
GRANDEURS : (1) epaisseur laterale de sombre a 15 % de la hauteur du visage ;
(2) hauteur sous le sommet de la coiffe ou 80 % de sa largeur max est atteinte ;
(3) rangees ou la peau touche le fond sans sombre.
CONTROLE POSITIF : (1) doit rendre ~20/20 px cote REFERENCE (l'oeil voit la coiffe
  descendre sur les tempes) et la largeur max de la coiffe doit etre la meme des deux
  cotes (r13 : 153 px). Si la reference rend 0, l'instrument est faux.
"""
import sys, collections; sys.path.insert(0, '.')
from commun import ouvrir, lum

CAS = [('REF','../reference-1080x2102.png', (86, 881, 501, 1528), (1078, 1096)),
       ('JEU2400','../capture-1080x2400.png', (83, 907, 498, 1555), (1092, 1110))]

def d2(a, b): return sum((a[i]-b[i])**2 for i in range(3))

for nom, fp, box, cyan in CAS:
    im = ouvrir(fp); px = im.load()
    x0, y0, x1, y1 = box
    h = collections.Counter()
    for y in range(y0, y1):
        for x in range(x0, x1):
            p = px[x, y]; h[(p[0]//6*6, p[1]//6*6, p[2]//6*6)] += 1
    gros = [(c, n) for c, n in h.most_common(20) if n > 5000]
    gros.sort(key=lambda t: -t[1])
    fond = gros[0][0]
    fonces = sorted([c for c, n in gros if lum(c) < 40 and c != fond], key=lambda c: -h[c])[:2]
    peau = max([c for c, n in gros if 110 < lum(c) < 200], key=lambda c: h[c])
    NOMINAUX = [('fond', fond), ('peau', peau)] + [('sombre', c) for c in fonces]
    NOMINAUX += [('creme', (234, 222, 198)), ('label', (138, 150, 156)), ('vert', (120, 174, 102))]
    print(f"\n== {nom} == seaux massifs : {gros}")
    print(f"   nominaux : {NOMINAUX}")
    cls = {}
    for y in range(y0, y1):
        if cyan[0] <= y <= cyan[1]: continue
        for x in range(x0, x1):
            cls[(x, y)] = min(NOMINAUX, key=lambda kv: d2(px[x, y], kv[1]))[0]
    # visage = plus grande composante connexe de peau
    vus = set(); best = []
    for p in list(cls):
        if cls[p] != 'peau' or p in vus: continue
        comp = []; dq = collections.deque([p]); vus.add(p)
        while dq:
            q = dq.popleft(); comp.append(q)
            for dx, dy in ((1,0),(-1,0),(0,1),(0,-1)):
                r = (q[0]+dx, q[1]+dy)
                if r in cls and r not in vus and cls[r] == 'peau': vus.add(r); dq.append(r)
        if len(comp) > len(best): best = comp
    ysv = sorted({p[1] for p in best})
    larg = {y: max(p[0] for p in best if p[1] == y)-min(p[0] for p in best if p[1] == y)+1 for y in ysv}
    lm = max(larg.values())
    rv = [y for y in ysv if larg[y] >= 0.60*lm]
    yv0, yv1 = min(rv), max(rv)
    print(f"   VISAGE (peau) : y{yv0}..{yv1} h={yv1-yv0+1} · largeur max = {lm} px")
    # coiffe = rangees de sombre au-dessus/autour du visage, largeur par rangee
    lsom = {}
    for y in range(y0, y1):
        if cyan[0] <= y <= cyan[1]: continue
        xs = [x for x in range(x0, x1) if cls.get((x, y)) == 'sombre']
        if xs: lsom[y] = (min(xs), max(xs), len(xs))
    # sommet : premiere rangee (en descendant) dont la LARGEUR PLEINE de sombre depasse 40 px
    #          et dont le compte de px sombres depasse 30 (ecarte les traits isoles)
    cand = [y for y in sorted(lsom) if y < yv0 and lsom[y][2] > 30 and lsom[y][1]-lsom[y][0]+1 > 40]
    sommet = min(cand) if cand else None
    zone = [y for y in sorted(lsom) if sommet and sommet <= y <= yv1]
    lmaxs = max(lsom[y][1]-lsom[y][0]+1 for y in zone) if zone else 0
    print(f"   COIFFE : sommet y={sommet} · largeur max de silhouette sombre = {lmaxs} px")
    if sommet:
        h80 = next((y-sommet for y in zone if lsom[y][1]-lsom[y][0]+1 >= 0.80*lmaxs), None)
        print(f"   (2) hauteur sous le sommet ou 80 % de la largeur max est atteinte : {h80} px")
        print("       pincement (largeur en % du max) a 4/8/16/32 px sous le sommet : " +
              " · ".join(f"{(lsom.get(sommet+k,(0,0,0))[1]-lsom.get(sommet+k,(0,0,0))[0]+1)/lmaxs*100:.1f}%"
                         for k in (4, 8, 16, 32)))
        for f in (0.05, 0.10, 0.15, 0.20, 0.30, 0.50):
            yq = int(yv0 + f*(yv1-yv0))
            if cyan[0] <= yq <= cyan[1]: yq = cyan[1]+1
            xs = [x for x in range(x0, x1) if cls.get((x, yq)) == 'peau']
            if not xs: print(f"      {int(f*100)}% : pas de peau"); continue
            # on marche de la peau vers l'exterieur JUSQU'AU PREMIER px de FOND et on
            # compte les px sombres rencontres : robuste au px de frange qui n'est ni
            # l'un ni l'autre (v2 comptait 0 des le premier px non-sombre, ce qui rendait
            # des valeurs alternees 25/0 puis 0/23 sur la REFERENCE : instrument fragile).
            g = 0; x = min(xs)-1
            while x > x0 and cls.get((x, yq)) != 'fond':
                if cls.get((x, yq)) == 'sombre': g += 1
                x -= 1
            d = 0; x = max(xs)+1
            while x < x1-1 and cls.get((x, yq)) != 'fond':
                if cls.get((x, yq)) == 'sombre': d += 1
                x += 1
            print(f"      (1) {int(f*100):2d}% (y={yq}) : sombre lateral G={g} D={d} px"
                  + ("   <<< la grandeur du dossier" if abs(f-0.15) < 1e-9 else ""))
        nu = []
        for y in range(yv0, yv1+1):
            if cyan[0] <= y <= cyan[1]: continue
            xs = [x for x in range(x0, x1) if cls.get((x, y)) == 'peau']
            if not xs: continue
            gg = 0; x = min(xs)-1
            while x > x0 and cls.get((x, y)) != 'fond':
                if cls.get((x, y)) == 'sombre': gg += 1
                x -= 1
            dd = 0; x = max(xs)+1
            while x < x1-1 and cls.get((x, y)) != 'fond':
                if cls.get((x, y)) == 'sombre': dd += 1
                x += 1
            if gg == 0 or dd == 0: nu.append(y)
        print(f"   (3) rangees ou la peau touche le fond SANS sombre : {len(nu)}"
              + (f"  (y {min(nu)}..{max(nu)})" if nu else ""))
