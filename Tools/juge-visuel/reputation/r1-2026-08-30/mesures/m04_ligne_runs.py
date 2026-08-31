#!/usr/bin/env python3
"""m04 — découpe HORIZONTALE par runs de couleur le long d'une ligne.
Sert aux grandeurs invariantes : largeurs et gouttières, exprimées en % de la largeur
de l'écran (donc comparables entre 900 px et 1080 px).

Contrôle positif : taille imprimée ; la largeur totale doit valoir 100 %.
"""
from PIL import Image


def runs(path, y, tol=8, minlen=3):
    im = Image.open(path).convert("RGB")
    w, h = im.size
    print(f"\n=== {path} taille={im.size} ligne y={y}")
    px = im.load()
    out = []
    cur = px[0, y]; d = 0
    for x in range(1, w):
        c = px[x, y]
        if any(abs(c[i] - cur[i]) > tol for i in range(3)):
            out.append((d, x - 1, cur)); cur = c; d = x
    out.append((d, w - 1, cur))
    for a, b, c in out:
        if b - a + 1 < minlen:
            continue
        print(f"      x {a:5d}..{b:5d}  l={b-a+1:5d} px  {100.0*(b-a+1)/w:6.2f} %L   rgb={c}")


REF = "/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r1-2026-08-30/reference/m-120.png"
C19 = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"

if __name__ == "__main__":
    print("--- rangée des COMPTEURS (milieu du bloc, sous les chiffres) ---")
    runs(REF, 668)   # ref : compteurs y 585..680
    runs(C19, 400)   # cap : compteurs y 262..413
    print("\n--- bloc MIROIR : partage portrait / colonne des voyants ---")
    runs(REF, 1300)  # ref : miroir y 708..1342, sous les cartes
    runs(C19, 1080)  # cap : miroir y 446..1122, sous les cartes
    print("\n--- une CARTE de règle (col ouvert) ---")
    runs(REF, 876)
    runs(C19, 616)
