"""MESURE DU PROFIL D'UN HALO — `P(d)`, la recette du juge visuel de ㊲, appliquée hors Unity.

Commité avec son verdict : un chiffre dont l'instrument n'est pas dans le dépôt n'est pas une
mesure, c'est un témoignage.

VERDICT DU 2026-09-07 — l'`Underlay` de TMP NE PEUT PAS atteindre la cible :
    douceur 0,55 (livrée) → portée 2 px       douceur 0,85 → portée 3 px
    douceur 0,70          → portée 2 px       douceur 1,00 (MAX) → portée 6 px
    référence                                  → portée 18 px, mi-valeur ~6
La dilatation ne fait pas mieux : 0,12 → 2 px, 0,40 → 3 px. **Aucun des deux boutons n'atteint
18 px.** Quatre correctifs successifs ont réglé un mécanisme incapable de la cible.

⚠️ PIÈGE D'INSTRUMENT PAYÉ EN L'ÉCRIVANT : avec une boîte à `N+6` px de marge, les excès
   devenaient NÉGATIFS et s'aggravaient avec la dilatation (−20 à 0,70). *Un fond qui baisse
   quand le signal monte est la signature d'un estimateur de fond contaminé par le signal* — la
   médiane de rangée montait avec le halo. La médiane se calcule donc sur les colonnes HORS de
   portée (Chebyshev > N de l'encre), et la boîte fait `3N+10`.

"""
"""P(d) — la recette du juge, appliquée hors Unity, en PIL pur (numpy indisponible).
   fond   = MÉDIANE DE LA RANGÉE sur l'intérieur de la boîte du compteur
   encre  = cœur cyan |c − (127,212,217)| <= 28, DILATÉ DE 2 px (avale la frange)
   anneau = Chebyshev à distance d de l'encre dilatée, borné AU-DESSUS du libellé
   excès  = L(x,y) − médiane(rangée)  ·  L = luma Rec.709
"""
import sys
from PIL import Image
from statistics import median

def luma(c): return 0.2126*c[0] + 0.7152*c[1] + 0.0722*c[2]
def dcyan(c): return ((c[0]-127)**2 + (c[1]-212)**2 + (c[2]-217)**2) ** .5

def profil(chemin, N=20):
    im = Image.open(chemin).convert('RGB'); px = im.load(); W, H = im.size
    coeur = [(x,y) for y in range(H) for x in range(W) if dcyan(px[x,y]) <= 28]
    if not coeur: return None, "aucune encre cyan"
    # COMPTEUR 1 = le groupe le plus à GAUCHE. Jamais le 2 : son « /4 » voisin contamine au-delà
    # de d6, le juge l'écrit noir sur blanc.
    xs = sorted({x for x,_ in coeur})
    xmax = xs[0]
    for a,b in zip(xs, xs[1:]):
        if b-a > 40: break
        xmax = b
    enc = {(x,y) for x,y in coeur if x <= xmax}
    x0=min(x for x,_ in enc); x1=max(x for x,_ in enc)
    y0=min(y for _,y in enc); y1=max(y for _,y in enc)
    # ⛔⛔ LA BOÎTE DOIT ÊTRE PLUS LARGE QUE LE HALO, SINON LA MÉDIANE EST LE HALO.
    #    Premier essai : boîte à N+6 px de marge ⇒ à dilate 0,70 les excès tombaient à −20 et
    #    s'aggravaient avec la dilatation. **Un fond qui BAISSE quand le signal MONTE est la
    #    signature d'un estimateur de fond contaminé par le signal** — la médiane de rangée
    #    montait avec le halo, donc tout le reste passait sous elle. Même classe que la frange
    #    d'anti-crénelage qui piégeait la sonde du titre : *ce qui entoure le glyphe n'est pas le
    #    fond tant qu'on ne l'a pas exclu.*
    marge = 3*N + 10
    bx0,bx1 = max(0,x0-marge), min(W,x1+marge+1)
    by0,by1 = max(0,y0-N-6), min(H,y1+5)            # rien sous l'encre : le libellé y est
    # ⇒ La médiane se calcule sur les colonnes HORS de portée du halo (Chebyshev > N de l'encre).
    loin = {}
    for y in range(by0,by1):
        vals=[luma(px[x,y]) for x in range(bx0,bx1)
              if min((abs(x-ex)+abs(y-ey) if False else max(abs(x-ex),abs(y-ey))) for ex,ey in ((x0,y0),(x1,y1))) > 0
              and (x < x0-N-2 or x > x1+N+2)]
        loin[y]=median(vals) if vals else None
    med = {y:(loin[y] if loin[y] is not None
              else median(luma(px[x,y]) for x in range(bx0,bx1))) for y in range(by0,by1)}
    def exces(x,y): return luma(px[x,y]) - med[y]
    def dilate(s, n=1):
        r = set(s)
        for _ in range(n):
            a = set(r)
            for (x,y) in r:
                for dx in (-1,0,1):
                    for dy in (-1,0,1):
                        a.add((x+dx, y+dy))
            r = a
        return r
    base = dilate(enc, 2)
    out, prec = [], base
    for _ in range(N):
        cur = dilate(prec, 1)
        anneau = [(x,y) for (x,y) in cur - prec if bx0 <= x < bx1 and by0 <= y < by1]
        out.append(sum(exces(x,y) for x,y in anneau)/len(anneau) if anneau else float('nan'))
        prec = cur
    return out, f"encre {len(enc)} px · boîte {bx1-bx0}x{by1-by0} · x {x0}..{x1} y {y0}..{y1}"

REF = [26.81,25.11,22.25,17.48,14.27,12.67,11.18,9.84,8.65,7.49,
       6.42,5.45,4.51,3.82,2.95,2.41,1.60,0.60,0.24,-0.10]
def portee(p):  # dernier d avec P > 0,5
    r=0
    for i,v in enumerate(p,1):
        if v==v and v>0.5: r=i
    return r
def mi(p):      # premier d sous la mi-valeur de P(1)
    if not p or p[0]!=p[0]: return 0
    h=p[0]/2
    for i,v in enumerate(p,1):
        if v==v and v<h: return i
    return len(p)

print("d      " + "".join(f"{k:7d}" for k in range(1,21)) + "   portée  mi-val")
print("réf    " + "".join(f"{v:7.2f}" for v in REF) + f"   {portee(REF):5d}   {mi(REF):5d}")
for f in sys.argv[1:]:
    p, info = profil(f)
    nom = f.split('/')[-1].replace('halo-dilate-','').replace('.png','')
    if p is None: print(f"{nom:6s} {info}"); continue
    print(f"{nom:6s}" + "".join(f"{v:7.2f}" for v in p) + f"   {portee(p):5d}   {mi(p):5d}   ({info})")
