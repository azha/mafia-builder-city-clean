"""m20 — APLATS et CONTRASTES (le gros du controle positif).
Chaque aplat : mediane d'une fenetre 7x7 a >= 3 px de tout bord (convention declaree).
Les points sont donnes en OFFSET depuis le bloc qui les porte, jamais en absolu.
Controle positif interne : les 4 aplats "hors DesignTokens" de la table des ASSUMES
(Encre, Panneau, Lisere, Vert) doivent etre EGAUX -> l'assume tient.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste, med_fenetre

REF = ouvrir('../reference-1080x2102.png')
J24 = ouvrir('../capture-1080x2400.png')
# (nom, (x,y) REF, (x,y) JEU2400)
PTS = [
 ('fond du cadre (haut)',        (540, 560),  (540, 590)),
 ('fond du cadre (bas)',         (540, 1930), (540, 1860)),
 ('fond du panneau d enseigne',  (120, 520),  (120, 550)),
 ('fond de boite de compteur',   (100, 730),  (100, 756)),
 ('fond du panneau elastique',   (520, 1580), (520, 1500)),
 ('fond de la carte portrait',   (120, 960),  (120, 986)),
 ('torse (silhouette)',          (200, 1350), (200, 1380)),
 ('peau du visage',              (260, 1150), (260, 1170)),
 ('creme du col',                (293, 1290), (290, 1320)),
 ('fond du panneau bas',         (150, 1700), (150, 1640)),
 ('fond de la boite du CTA',     (150, 2000), (150, 1925)),
 ('fond d une tuile',            (960, 1050), (960, 1045)),
 ('vert "Il vous ecoute"',       (191, 1440), (187, 1467)),
]
print("\n== APLATS (mediane 7x7) ==")
ecarts = []
for n, a, b in PTS:
    ca = med_fenetre(REF, a[0], a[1]); cb = med_fenetre(J24, b[0], b[1])
    d = max(abs(ca[i]-cb[i]) for i in range(3))
    ecarts.append(d)
    print(f"   {n:32s} REF {str(ca):18s} JEU {str(cb):18s} ecart max/canal = {d}/255")
print(f"   -> {sum(1 for d in ecarts if d <= 6)}/{len(ecarts)} aplats a <= 6/255 ;"
      f" {sum(1 for d in ecarts if d <= 3)} a <= 3/255")

print("\n== FILET OR du cadre ==")
print("   REF", med_fenetre(REF, 540, 453), " JEU", med_fenetre(J24, 540, 484))
print("   rail gauche REF", med_fenetre(REF, 22, 1200), " JEU", med_fenetre(J24, 19, 1200))

print("\n== DEGRADE de la boite de compteur (mediane de rangee, x100..300) ==")
for nom, im, y0, y1 in [('REF', REF, 706, 812), ('JEU2400', J24, 732, 838)]:
    px = im.load()
    v = [(y, mediane([lum(px[x, y]) for x in range(100, 301)])) for y in (y0, y0+10, (y0+y1)//2, y1-10, y1)]
    print(f"   {nom} : " + " · ".join(f"y+{y-y0}:{l:.1f}" for y, l in v)
          + f"   AMPLITUDE = {max(l for _, l in v)-min(l for _, l in v):.1f} pts")

print("\n== CONTRASTES (encre vs fond local a 8 px) ==")
def contraste_texte(im, x0, y0, x1, y1, nom, seuil_frac=0.6):
    px = im.load()
    vals = [lum(px[x, y]) for y in range(y0, y1+1) for x in range(x0, x1+1)]
    lo = sorted(vals)[len(vals)//10]; hi = sorted(vals)[int(len(vals)*0.995)]
    s = lo + seuil_frac*(hi-lo)
    E = [(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1) if lum(px[x, y]) >= s]
    coeur = [px[x, y] for (x, y) in E
             if all((x+dx, y+dy) in set(E) for dx in (-1,0,1) for dy in (-1,0,1))]
    if not coeur: print(f"   {nom} : pas d'encre"); return
    cm = tuple(int(round(mediane([c[i] for c in coeur]))) for i in range(3))
    fond = tuple(int(round(mediane([px[x, y][i] for y in range(y0, y1+1) for x in range(x0, x1+1)
                                    if lum(px[x, y]) < lo+3]))) for i in range(3))
    print(f"   {nom:34s} encre {str(cm):18s} fond {str(fond):18s} -> {contraste(cm, fond):5.2f}:1")

for nom, im, C in [('REF', REF, 452), ('JEU2400', J24, 482)]:
    d = 0 if nom == 'REF' else 1
    print(f"  -- {nom} --")
    contraste_texte(im, 330, C+61+d, 745, C+108+d, 'titre « Le miroir »')
    contraste_texte(im, 150, C+137+6*d, 925, C+154+6*d, 'sous-titre')
    contraste_texte(im, 240, C+(1269-452 if d==0 else 1154), 850, C+(1307-452 if d==0 else 1191), 'titre du panneau bas')
    contraste_texte(im, 240, C+(1533-452 if d==0 else 1427), 850, C+(1556-452 if d==0 else 1454), 'libelle du CTA')
    contraste_texte(im, 175, C+(982-452 if d==0 else 979), 415, C+(1006-452 if d==0 else 1004), '« Il vous ecoute »')
