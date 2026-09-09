"""m06 — LE HALO DES COMPTEURS. Methode DECLAREE AVANT tout comptage.
(v2 : la v1 est conservee dans l'historique de ce fichier ; elle etait FAUSSE de deux
 facons, toutes deux imprimees a l'ecran avant d'etre corrigees :
   (a) elle erodait la boite de 3 px, ce qui laissait la frange d'anti-crenelage du
       lisere DANS la boite -> le "fond" pris aux 4 coins valait 26,3 dans la reference
       alors que le fond reel vaut ~15, et TOUS les exces sortaient NEGATIFS ;
   (b) elle seuillait l'encre sur le maximum du profil de RANGEES (une moyenne, ~65)
       au lieu du maximum des PIXELS (~194) -> le halo lui-meme etait classe "encre",
       et le "coeur du chiffre" rendait (53,87,92), c'est-a-dire la couleur du HALO.
 Le signe uniformement negatif de (a) est ce qui a trahi l'instrument.)

BOITE DE MESURE. Interieur du `.fen` de chaque compteur (bords m05b), erode de 8 px
  (le lisere fait 3 px et sa frange 2-3 px de plus). Contient le chiffre ET son libelle.

FOND. Mode de l'histogramme de luminance de la boite (pas 0,25), c'est-a-dire le niveau
  le plus frequent : le fond de la boite. Publie a chaque fois.

(1) COMPTAGE DES BANDES D'ENCRE — critere, et son test de "sans seuil".
    profil(y) = MOYENNE de luminance sur toutes les colonnes de la boite.
    exces e(y) = profil(y) - min(profil).
    bandes(f) = runs maximaux de rangees ou e(y) >= f*max(e), f balaye 0,02..0,50.
    Le compte n'est un FAIT que si bandes(f) est CONSTANT sur la plage ; sinon je publie
    les f de bascule et le compte est un REGLAGE, pas un fait.
    Grandeur continue SANS aucun reglage, publiee a cote :
    VALLEE = min de e(y) entre la bande du chiffre et la bande du libelle (bandes prises
    a f=0,50 pour les localiser), rapportee au plus petit des deux pics.
    0,00 = deux bandes franchement separees ; 1,00 = une seule masse.

(2) COQUILLES DE CHEBYSHEV.
    encre = px de la boite de luminance >= FOND + 0,50*(P99,5 - FOND) (P99,5 = percentile
    99,5 des px de la boite : le niveau des glyphes). Sensibilite balayee a 0,40 et 0,60.
    coquille d = px non-encre a distance de Chebyshev exactement d.
    exces(d) = moyenne de la coquille - FOND.

(3) CONTRASTE DES CHIFFRES = WCAG entre la mediane du COEUR de l'encre (px d'encre dont
    les 24 voisins a +-2 sont tous encre) et le fond local (coquilles d2..d4).

(4) A*exp(-d/lambda), moindres carres sur ln(exces), d2..d12.

CONTROLE POSITIF : compteur 1 de la REFERENCE = 2 bandes (chiffre, libelle) ; coeur du
  chiffre = le cyan nominal (127,212,217) releve au r13. Si l'un des deux rate, l'instrument
  est faux et je ne conclus pas.
CONTROLE NEGATIF : la moitie basse VIDE du panneau elastique doit rendre 0 bande d'encre.
"""
import sys, math, collections; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste

BOITES = {
 'REF':    ('../reference-1080x2102.png', 702, 815, [(50,361),(384,695),(718,1029)]),
 'JEU2400':('../capture-1080x2400.png',   728, 840, [(49,357),(386,693),(722,1030)]),
 'JEU1920':('../capture-1080x1920.png',   408, 520, [(49,357),(386,693),(722,1030)]),
}
NOMS = ['1 REGLES DONNEES', '2 ABSORBEES', '3 ENFREINTES']
ER = 8

def mode_lum(vals, pas=0.25):
    h = collections.Counter(round(v / pas) for v in vals)
    return h.most_common(1)[0][0] * pas

def percentile(vals, p):
    v = sorted(vals); return v[min(len(v) - 1, int(p * len(v)))]

def analyse(im, y0, y1, x0, x1, etiq, verbeux=True):
    px = im.load()
    Y0, Y1, X0, X1 = y0 + ER, y1 - ER, x0 + ER, x1 - ER
    tous = [lum(px[x, y]) for y in range(Y0, Y1 + 1) for x in range(X0, X1 + 1)]
    FOND = mode_lum(tous); P995 = percentile(tous, 0.995)
    prof = [sum(lum(px[x, y]) for x in range(X0, X1 + 1)) / (X1 - X0 + 1)
            for y in range(Y0, Y1 + 1)]
    e = [v - min(prof) for v in prof]; emax = max(e)
    print(f"\n--- {etiq} : boite x{X0}..{X1} y{Y0}..{Y1} · FOND={FOND:.2f} · P99,5={P995:.1f} ---")

    def bandes(f):
        out = []; dedans = False
        for k, v in enumerate(e):
            if v >= f * emax:
                if not dedans: deb = k; dedans = True
            elif dedans:
                out.append((deb + Y0, k - 1 + Y0)); dedans = False
        if dedans: out.append((deb + Y0, len(e) - 1 + Y0))
        return out
    prev = None; basc = []
    for i in range(2, 51):
        f = i / 100.0; n = len(bandes(f))
        if n != prev: basc.append((f, n)); prev = n
    print("   BANDES(f), f de 0,02 a 0,50 :", "  ".join(f"f>={f:.2f}→{n}" for f, n in basc))
    b50 = bandes(0.50)
    print(f"   bandes a f=0,50 : {b50}")
    b10 = bandes(0.10)
    print(f"   bandes a f=0,10 : {b10}")
    if len(b50) >= 2:
        (a1, b1), (a2, b2) = b50[0], b50[-1]
        seg = e[b1 - Y0 + 1:a2 - Y0]
        p1 = max(e[a1 - Y0:b1 - Y0 + 1]); p2 = max(e[a2 - Y0:b2 - Y0 + 1])
        if seg:
            print(f"   VALLEE entre [{a1}..{b1}] et [{a2}..{b2}] : min e={min(seg):.2f} ;"
                  f" pics {p1:.2f} / {p2:.2f} ; vallee/min(pics) = {min(seg)/min(p1,p2):.3f}")
    ex = {}
    for niv in (0.40, 0.50, 0.60):
        seuil = FOND + niv * (P995 - FOND)
        E = {(x, y) for y in range(Y0, Y1 + 1) for x in range(X0, X1 + 1)
             if lum(px[x, y]) >= seuil}
        if niv != 0.50:
            print(f"   [sensibilite] encre a {int(niv*100)}% : {len(E)} px (seuil lum {seuil:.1f})")
            continue
        print(f"   ENCRE a 50% : {len(E)} px (seuil lum {seuil:.1f})")
        dist = {}; dq = collections.deque()
        for p in E: dist[p] = 0; dq.append(p)
        while dq:
            x, y = dq.popleft(); d = dist[(x, y)]
            if d >= 34: continue
            for dx in (-1, 0, 1):
                for dy in (-1, 0, 1):
                    q = (x + dx, y + dy)
                    if X0 <= q[0] <= X1 and Y0 <= q[1] <= Y1 and q not in dist:
                        dist[q] = d + 1; dq.append(q)
        pd = {}
        for (x, y), d in dist.items():
            if d: pd.setdefault(d, []).append(lum(px[x, y]))
        for d in [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 30]:
            if d in pd:
                ex[d] = sum(pd[d]) / len(pd[d]) - FOND
                print(f"      d={d:2d}  n={len(pd[d]):5d}  exces={ex[d]:+6.2f}")
        coeur = [px[x, y] for (x, y) in E
                 if all((x + dx, y + dy) in E for dx in (-2, -1, 0, 1, 2) for dy in (-2, -1, 0, 1, 2))]
        ring = [px[x, y] for (x, y), d in dist.items() if 2 <= d <= 4]
        if coeur and ring:
            cm = tuple(int(round(mediane([c[i] for c in coeur]))) for i in range(3))
            rm = tuple(int(round(mediane([c[i] for c in ring]))) for i in range(3))
            print(f"   coeur d'encre {cm} (n={len(coeur)}) · fond local d2..d4 {rm} (n={len(ring)})"
                  f" · CONTRASTE = {contraste(cm, rm):.2f}:1")
    pts = [(d, ex[d]) for d in (2, 4, 6, 8, 10, 12) if d in ex and ex[d] > 0.05]
    if len(pts) >= 3:
        n = len(pts); sx = sum(p[0] for p in pts); sy = sum(math.log(p[1]) for p in pts)
        sxx = sum(p[0] ** 2 for p in pts); sxy = sum(p[0] * math.log(p[1]) for p in pts)
        bb = (n * sxy - sx * sy) / (n * sxx - sx * sx); aa = (sy - bb * sx) / n
        A = math.exp(aa); lam = -1.0 / bb
        print(f"   AJUSTEMENT d2..d12 : A={A:.2f} pts · lambda={lam:.2f} px · A·lambda^2={A*lam*lam:.0f}")
    return ex

res = {}
for k, (f, y0, y1, xs) in BOITES.items():
    im = ouvrir(f); res[k] = []
    for i, (a, b) in enumerate(xs):
        res[k].append(analyse(im, y0, y1, a, b, f"{k} · compteur {NOMS[i]}"))

print("\n===== CONTROLE NEGATIF : zone vide du pied du panneau elastique =====")
im = ouvrir('../capture-1080x2400.png')
analyse(im, 1480, 1540, 100, 400, 'JEU2400 · zone vide (doit rendre 1 bande de bruit ou 0)')

print("\n\n===== TABLE : exces par distance, compteur 1 =====")
ds = [2, 4, 6, 8, 10, 12, 14, 16, 18, 20, 22, 26, 30]
print("| d | " + " | ".join(str(d) for d in ds) + " |")
for k in ('REF', 'JEU2400', 'JEU1920'):
    print(f"| {k} | " + " | ".join(f"{res[k][0].get(d, float('nan')):+.1f}" for d in ds) + " |")
print("| jeu2400/ref | " + " | ".join(
    f"{res['JEU2400'][0][d]/res['REF'][0][d]:.2f}" if res['REF'][0].get(d, 0) > 0 and d in res['JEU2400'][0] else "-"
    for d in ds) + " |")
