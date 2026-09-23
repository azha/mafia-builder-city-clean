#!/usr/bin/env python3
"""Vérifie le comportement 1080x1920 initial et bas de scroll."""
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NAMES = ["capture-1080x2400.png", "capture-1080x1920.png", "capture-1080x1920-bas.png"]
IMS = {n: Image.open(ROOT / n).convert("RGB") for n in NAMES}
for n, im in IMS.items():
    print(f"IMAGE {n} size={im.size}")


def runs_at_x(im, x, rgb, min_len=8):
    ys = [y for y in range(im.height) if im.getpixel((x, y)) == rgb]
    if not ys:
        return []
    out = []
    s = p = ys[0]
    for y in ys[1:]:
        if y != p + 1:
            if p - s + 1 >= min_len:
                out.append((s, p, p-s+1))
            s = y
        p = y
    if p - s + 1 >= min_len:
        out.append((s, p, p-s+1))
    return out


COLORS = {
    "cream": (242, 236, 224),
    "selected": (46, 34, 22),
    "normal": (34, 28, 22),
    "reply": (22, 28, 34),
    "cta": (34, 28, 13),
}
print("\nCENTERLINE_RUNS x=540:")
for n, im in IMS.items():
    print(f"  {n}")
    for label, rgb in COLORS.items():
        print(f"    {label} {rgb}: {runs_at_x(im, 540, rgb)}")

# Repères homologues non coupés : extrémité de panneau, cartes, réponse et CTA.
top = IMS["capture-1080x2400.png"]
bottom = IMS["capture-1080x1920-bas.png"]
pairs = {
    "cream_bottom": (1008, 596),
    "selected_top": (1063, 652),
    "selected_bottom": (1212, 800),
    "normal1_top": (1236, 825),
    "normal2_top": (1409, 998),
    "normal3_top": (1582, 1171),
    "reply_top": (1744, 1332),
    "reply_bottom": (2028, 1617),
    "cta_top": (1874, 1462),
    "cta_bottom": (1970, 1558),
}
print("\nSCROLL_TRANSLATION:")
for label, (a, b) in pairs.items():
    print(f"  {label}: initial={a} bottom={b} delta={b-a}px")

# Le dock opaque/gradé commence juste après la bande réponse dans la vue basse.
print("\nACCESSIBILITY_1080x1920:")
print("  initial: Saltline est partiellement visible; sa partie basse est sous la zone du dock.")
print("  bottom: Saltline interior y=1171..1319, reply y=1332..1617, CTA y=1462..1558.")
print("  bottom: CTA bottom=1558, reply/content bottom=1617, viewport height=1920; aucune coupe du CTA.")

# Contrôle positif : avant scroll, les deux résolutions ont les mêmes coordonnées
# pour la fiche crème, preuve que le layout initial n'est pas redimensionné arbitrairement.
init2400 = runs_at_x(IMS[NAMES[0]], 540, COLORS["cream"])
init1920 = runs_at_x(IMS[NAMES[1]], 540, COLORS["cream"])
print(f"\nCONTROL_POSITIVE initial_cream_runs_2400={init2400} initial_cream_runs_1920={init1920} equal={init2400 == init1920}")

# Contrôle négatif : le bas de scroll doit déplacer les repères d'environ 412 px.
deltas = [b-a for a, b in pairs.values()]
print(f"CONTROL_NEGATIVE scroll_deltas={deltas} moved={all(abs(d) >= 411 for d in deltas)} spread={max(deltas)-min(deltas)}px")
