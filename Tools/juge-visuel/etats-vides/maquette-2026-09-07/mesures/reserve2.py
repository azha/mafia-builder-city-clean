#!/usr/bin/env python3
"""INSTRUMENT 3-bis — la reserve de lisibilite, mesuree par ce qui DECIDE.

`reserve.py` cherche la fenetre la plus UNIFORME (sigma minimale). C'est la grandeur que le
dossier prescrit, et elle repond mal a la question qu'on lui pose : une fenetre peut etre
parfaitement uniforme ET a 2,4:1 (un aplat ocre), et une fenetre legerement bruitee peut
porter un texte creme sans une faute. La grandeur qui DECIDE est la PART de la fenetre ou
un texte creme (ou encre) tient a >= 4,5:1.

Seuils derives, pas choisis : contraste(creme, L) >= 4,5  <=>  L <= 0.1211
                              contraste(encre, L) >= 4,5  <=>  L >= 0.1953
Entre les deux : bande morte, aucune des deux encres du canon ne passe.

On balaie la meme fenetre 614x204 et on maximise la part creme-sure, puis la part encre-sure.
"""
import os, sys
from array import array
from PIL import Image

CREME = (0xea, 0xe0, 0xc8); ENCRE = (0x0b, 0x10, 0x16)
BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMAGES = sorted(f for f in os.listdir(BASE) if f.endswith(".png"))
_LIN = [(u/255/12.92) if (u/255) <= 0.04045 else (((u/255)+0.055)/1.055)**2.4 for u in range(256)]


def lrel(c):
    return 0.2126*_LIN[c[0]] + 0.7152*_LIN[c[1]] + 0.0722*_LIN[c[2]]


def contraste(a, b):
    la = a if isinstance(a, float) else lrel(a)
    lb = b if isinstance(b, float) else lrel(b)
    return (max(la, lb)+0.05)/(min(la, lb)+0.05)


L_CREME_MAX = (lrel(CREME)+0.05)/4.5 - 0.05
L_ENCRE_MIN = 4.5*(lrel(ENCRE)+0.05) - 0.05


def integral_masque(im, test):
    W, H = im.size; px = im.load()
    I = array('i', [0]) * ((W+1)*(H+1))
    for y in range(H):
        run = 0; b0 = y*(W+1); b1 = (y+1)*(W+1)
        for x in range(W):
            run += 1 if test(px[x, y]) else 0
            I[b1+x+1] = I[b0+x+1] + run
    return I


def meilleure(I, W, H, ww, hh, pas=8):
    best = None
    for y in range(0, H-hh+1, pas):
        a = y*(W+1); b = (y+hh)*(W+1)
        for x in range(0, W-ww+1, pas):
            v = I[b+x+ww] - I[b+x] - I[a+x+ww] + I[a+x]
            if best is None or v > best[0]:
                best = (v, x, y)
    return best[0]/(ww*hh)*100, best[1], best[2]


def controle_positif():
    print("== CONTROLE POSITIF ==")
    print(f"  seuils DERIVES : creme tient jusqu'a L<={L_CREME_MAX:.4f} ; encre tient a partir de L>={L_ENCRE_MIN:.4f}")
    ok = abs(contraste(CREME, L_CREME_MAX)-4.5) < 1e-6 and abs(contraste(ENCRE, L_ENCRE_MIN)-4.5) < 1e-6
    print(f"  verification : contraste(creme,{L_CREME_MAX:.4f})={contraste(CREME,L_CREME_MAX):.3f} ; "
          f"contraste(encre,{L_ENCRE_MIN:.4f})={contraste(ENCRE,L_ENCRE_MIN):.3f} -> {'OK' if ok else 'ECHEC'}")
    # controle POSITIF + NEGATIF sur une image dont la reponse est connue d'avance
    W = H = 240; ww, hh = int(W*0.6), int(H*0.2)
    im = Image.new("RGB", (W, H), (176, 141, 62))               # ocre : creme NE tient PAS
    im.paste(Image.new("RGB", (W, 60), (22, 28, 43)), (0, 40))  # bande sombre y=40..99 : creme tient
    I = integral_masque(im, lambda c: lrel(c) <= L_CREME_MAX)
    part, x, y = meilleure(I, W, H, ww, hh, pas=4)
    print(f"  synthetique {im.size} bande creme-sure posee y=40..99 -> part={part:.1f}% a y={y} (h={hh}) "
          f"[attendu 100% et 40<=y<={100-hh}] -> {'OK' if part == 100.0 and 40 <= y <= 100-hh else 'ECHEC'}")
    ok &= part == 100.0 and 40 <= y <= 100-hh
    J = integral_masque(im, lambda c: lrel(c) >= L_ENCRE_MIN)   # ocre : encre tient
    part2, _, y2 = meilleure(J, W, H, ww, hh, pas=4)
    print(f"  meme image, part encre-sure -> {part2:.1f}% a y={y2} [attendu 100% hors de la bande sombre] "
          f"-> {'OK' if part2 == 100.0 else 'ECHEC'}")
    ok &= part2 == 100.0
    # controle NEGATIF : un aplat entierement dans la bande morte doit rendre 0 des DEUX cotes
    mort = Image.new("RGB", (W, H), (120, 120, 120))
    pm = meilleure(integral_masque(mort, lambda c: lrel(c) <= L_CREME_MAX), W, H, ww, hh, 8)[0]
    pe = meilleure(integral_masque(mort, lambda c: lrel(c) >= L_ENCRE_MIN), W, H, ww, hh, 8)[0]
    print(f"  controle NEGATIF gris #787878 (L={lrel((120,120,120)):.4f}, bande morte) -> creme {pm:.0f}% / encre {pe:.0f}% "
          f"[attendu 0/0] -> {'OK' if pm == 0 and pe == 0 else 'ECHEC'}")
    return ok and pm == 0 and pe == 0


if __name__ == "__main__":
    if not controle_positif():
        sys.exit("controle positif en echec")
    print("\n== PART D'UNE BOITE DE TEXTE 614x204 QUI TIENT A >= 4,5:1 ==")
    print("    id  fichier                  taille     creme-sure (x,y)      encre-sure (x,y)")
    for i, f in enumerate(IMAGES, 1):
        im = Image.open(os.path.join(BASE, f)).convert("RGB")
        W, H = im.size; ww, hh = int(W*0.6), int(H*0.2)
        pc, xc, yc = meilleure(integral_masque(im, lambda c: lrel(c) <= L_CREME_MAX), W, H, ww, hh)
        pe, xe, ye = meilleure(integral_masque(im, lambda c: lrel(c) >= L_ENCRE_MIN), W, H, ww, hh)
        print(f"    E{i:<3}{f:<24} {W}x{H}   {pc:6.2f}% ({xc:4d},{yc:4d})   {pe:6.2f}% ({xe:4d},{ye:4d})")
