"""m21 — reprise des mesures que m20 a placees au mauvais endroit.
m20 ancrait le CTA et « Il vous ecoute » sur le filet du CADRE alors que m19 v2 donne
leurs offsets DANS LEUR BLOC : les fenetres tombaient sur du fond, et le contraste rendait
1,00:1 des deux cotes (un resultat UNIFORME = l'instrument mesurait autre chose).
Ancres refaites : CTA REF y1985..2008 / JEU y1909..1936 ; « Il vous ecoute » REF
y1434..1458 / JEU y1462..1486 ; titre du panneau bas REF y1721..1759 / JEU y1656..1693.
"""
import sys; sys.path.insert(0, '.')
from commun import ouvrir, lum, mediane, contraste

REF = ouvrir('../reference-1080x2102.png'); J = ouvrir('../capture-1080x2400.png')

def bloc(im, x0, y0, x1, y1, nom, frac=0.6):
    px = im.load()
    vals = [lum(px[x, y]) for y in range(y0, y1+1) for x in range(x0, x1+1)]
    lo = sorted(vals)[len(vals)//10]; hi = sorted(vals)[int(len(vals)*0.995)]
    s = lo + frac*(hi-lo)
    E = {(x, y) for y in range(y0, y1+1) for x in range(x0, x1+1) if lum(px[x, y]) >= s}
    coeur = [px[x, y] for (x, y) in E
             if all((x+dx, y+dy) in E for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
    fondpx = [px[x, y] for y in range(y0, y1+1) for x in range(x0, x1+1) if lum(px[x, y]) < lo+3]
    if not coeur or not fondpx:
        print(f"   {nom:30s} : encre ou fond introuvable"); return
    cm = tuple(int(round(mediane([c[i] for c in coeur]))) for i in range(3))
    fm = tuple(int(round(mediane([c[i] for c in fondpx]))) for i in range(3))
    xs = [p[0] for p in E]; ys = [p[1] for p in E]
    print(f"   {nom:30s} encre {str(cm):18s} fond {str(fm):18s} -> {contraste(cm, fm):5.2f}:1"
          f"   bbox x{min(xs)}..{max(xs)} (l={max(xs)-min(xs)+1}) y{min(ys)}..{max(ys)} (h={max(ys)-min(ys)+1})"
          f"  n={len(E)}")

print("\n== textes re-ancres ==")
print("  -- REFERENCE --")
bloc(REF, 150, 1985, 930, 2008, 'libelle du CTA')
bloc(REF, 160, 1434, 430, 1458, '« Il vous ecoute »')
bloc(REF, 80, 1721, 1000, 1759, 'titre du panneau bas')
bloc(REF, 80, 1680, 1000, 1699, 'sur-titre du panneau bas')
print("  -- JEU 2400 --")
bloc(J, 150, 1909, 930, 1936, 'libelle du CTA')
bloc(J, 160, 1462, 430, 1486, '« Il vous ecoute »')
bloc(J, 80, 1656, 1000, 1693, 'titre du panneau bas')
bloc(J, 80, 1616, 1000, 1631, 'sur-titre du panneau bas')

print("\n== filet or : mediane d'UNE rangee, coeur du trait ==")
def rangee(im, y, x0, x1, nom):
    px = im.load()
    c = tuple(int(round(mediane([px[x, y][i] for x in range(x0, x1+1)]))) for i in range(3))
    print(f"   {nom:34s} y={y} : {c}")
rangee(REF, 453, 200, 900, 'REF filet haut du cadre')
rangee(J, 483, 200, 900, 'JEU filet haut du cadre')
rangee(REF, 666, 200, 900, 'REF filet or sous l enseigne')
rangee(J, 690, 200, 900, 'JEU filet or sous l enseigne')
def colonne(im, x, y0, y1, nom):
    px = im.load()
    c = tuple(int(round(mediane([px[x, y][i] for y in range(y0, y1+1)]))) for i in range(3))
    print(f"   {nom:34s} x={x} : {c}")
colonne(REF, 22, 1000, 1400, 'REF rail gauche du cadre')
colonne(J, 19, 1000, 1400, 'JEU rail gauche du cadre')

print("\n== degrade interieur de la boite de compteur (RGB par rangee, x100..300) ==")
for nom, im, ys in [('REF', REF, (712, 740, 776, 800)), ('JEU', J, (738, 766, 802, 826))]:
    px = im.load()
    for y in ys:
        c = tuple(int(round(mediane([px[x, y][i] for x in range(100, 301)]))) for i in range(3))
        print(f"   {nom} y={y} : {c}  L={lum(c):.1f}")

print("\n== luminance moyenne du cadre entier ==")
for nom, im, y0, y1 in [('REF', REF, 452, 2078), ('JEU2400', J, 482, 2109)]:
    px = im.load()
    s = 0; n = 0
    for y in range(y0, y1+1, 3):
        for x in range(21, 1059, 3):
            s += lum(px[x, y]); n += 1
    print(f"   {nom} : {s/n:.2f}")
