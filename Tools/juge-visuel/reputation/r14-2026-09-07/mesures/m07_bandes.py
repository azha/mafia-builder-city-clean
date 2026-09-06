"""m07 — COMPTAGE DES BANDES D'ENCRE. Methode declaree AVANT de compter.

Pourquoi un troisieme instrument : dans m06 le profil de rangees etait
mean(rangee) - min(profil). Il herite donc du DEGRADE de fond du `.fen` (la reference en
a un : la bande superieure de la boite ressort a f=0,10 alors qu'elle est vide). Un profil
contamine par le fond fabrique des bandes qui ne sont pas de l'encre.

PROFIL RETENU, sans aucun reglage :   e(y) = MOYENNE(rangee) - MEDIANE(rangee)
  L'encre est minoritaire en colonnes : la mediane d'une rangee EST son fond, quel que
  soit le degrade, et la moyenne le depasse d'autant qu'il y a d'encre. e(y)=0 sur une
  rangee vide, par construction, sans margeur ni standoff a choisir.

COMPTE : bandes(f) = runs maximaux de rangees ou e(y) >= f*max(e), f de 0,02 a 0,60.
  Le compte n'est un FAIT que sur le PLATEAU de constance le plus large ; je publie la
  courbe entiere et la largeur du plateau. Hors plateau, le compte est un reglage.
GRANDEUR CONTINUE SANS REGLAGE : la VALLEE = min de e(y) entre le pic du chiffre
  (max de e sur la moitie haute) et le pic du libelle (max de e sur la moitie basse),
  en points de luminance ET en fraction du plus petit des deux pics.
  vallee = 0,000 -> deux bandes franchement separees ; -> 1,000 -> une seule masse.

CONTROLE POSITIF : la reference doit rendre 2 sur son plateau (chiffre / libelle) et sa
  vallee doit valoir 0,000 (l'oeil voit deux lignes separees sur la maquette).
CONTROLE NEGATIF : une bande VIDE du cadre doit rendre 0 bande et un max(e) < 1 pt.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane

BOITES = {
 'REF':    ('../reference-1080x2102.png', 702, 815, [(50,361),(384,695),(718,1029)]),
 'JEU2400':('../capture-1080x2400.png',   728, 840, [(49,357),(386,693),(722,1030)]),
 'JEU1920':('../capture-1080x1920.png',   408, 520, [(49,357),(386,693),(722,1030)]),
}
NOMS = ['1 REGLES DONNEES', '2 ABSORBEES', '3 ENFREINTES']
ER = 8

def profil(im, y0, y1, x0, x1):
    px = im.load(); Y0, Y1, X0, X1 = y0+ER, y1-ER, x0+ER, x1-ER
    out = []
    for y in range(Y0, Y1+1):
        v = [lum(px[x, y]) for x in range(X0, X1+1)]
        out.append(sum(v)/len(v) - mediane(v))
    return Y0, out

def compte(e, f):
    emax = max(e); out = []; dedans = False
    for k, v in enumerate(e):
        if v >= f*emax:
            if not dedans: deb = k; dedans = True
        elif dedans:
            out.append((deb, k-1)); dedans = False
    if dedans: out.append((deb, len(e)-1))
    return out

def juge(im, y0, y1, x0, x1, etiq):
    Y0, e = profil(im, y0, y1, x0, x1)
    emax = max(e)
    print(f"\n--- {etiq} : max(e)={emax:.2f} pts ---")
    courbe = []
    prev = None
    for i in range(2, 61):
        f = i/100.0; n = len(compte(e, f))
        courbe.append((f, n))
        if n != prev: prev = n
    # plateau le plus large
    best = None; i = 0
    while i < len(courbe):
        j = i
        while j+1 < len(courbe) and courbe[j+1][1] == courbe[i][1]: j += 1
        if best is None or (j-i) > (best[1]-best[0]): best = (i, j)
        i = j+1
    print("   courbe bandes(f) :", " ".join(f"{f:.2f}:{n}" for f, n in courbe if f*100 % 4 < 1))
    fa, fb = courbe[best[0]][0], courbe[best[1]][0]
    print(f"   PLATEAU le plus large : {courbe[best[0]][1]} bande(s) pour f de {fa:.2f} a {fb:.2f}"
          f"  (largeur {fb-fa:.2f})")
    for f in (0.05, 0.10, 0.20, 0.30):
        b = compte(e, f)
        print(f"      f={f:.2f} -> {len(b)} : " + ", ".join(f"y{Y0+a}..{Y0+c}" for a, c in b))
    n = len(e); mid = n//2
    ih = e.index(max(e[:mid])); ib = mid + e[mid:].index(max(e[mid:]))
    seg = e[ih+1:ib]
    if seg:
        v = min(seg)
        print(f"   pic haut y={Y0+ih} e={e[ih]:.2f} · pic bas y={Y0+ib} e={e[ib]:.2f}"
              f" · VALLEE={v:.2f} pts · vallee/min(pics)={v/min(e[ih],e[ib]):.3f}"
              f" (creux a y={Y0+ih+1+seg.index(v)})")
    return e, Y0

E = {}
for k, (f, y0, y1, xs) in BOITES.items():
    im = ouvrir(f); E[k] = []
    for i, (a, b) in enumerate(xs):
        E[k].append(juge(im, y0, y1, a, b, f"{k} · compteur {NOMS[i]}"))

print("\n===== CONTROLE NEGATIF : bande vide du cadre =====")
im = ouvrir('../capture-1080x2400.png')
Y0, e = profil(im, 1990, 2100, 60, 1020)
print(f"   bande vide y1998..2092 : max(e) = {max(e):.3f} pt  -> {len(compte(e,0.10))} bande(s) a f=0,10")
im = ouvrir('../reference-1080x2102.png')
Y0, e = profil(im, 1880, 1945, 60, 1020)
print(f"   REF bande vide y1888..1937 : max(e) = {max(e):.3f} pt")

print("\n===== PROFIL e(y) RANGEE PAR RANGEE, compteur 1, zone chiffre->libelle =====")
for k in ('REF', 'JEU2400'):
    e, Y0 = E[k][0]
    print(f"  {k} (y de {Y0}) :")
    s = ""
    for i, v in enumerate(e):
        s += f"{Y0+i}:{v:5.1f}  "
        if len(s) > 110: print("    " + s); s = ""
    if s: print("    " + s)
