#!/usr/bin/env python3
"""Outils communs. Tout script qui l'importe imprime la taille des images ouvertes."""
import os
from PIL import Image

D = "/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/ensemble-decor/r4-2026-10-09"
CAP = os.path.join(D, "captures")
REF = os.path.join(D, "reference")
OUT = "/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/4d730551-6e39-49e9-96e2-3526c05e5451/scratchpad/vues"
os.makedirs(OUT, exist_ok=True)

# Échelle imposée par dossier.md : 1 px CSS = 3,6 px d'image DES DEUX COTES.
K = 3.6

def ouvrir(kind, nom):
    p = os.path.join(CAP if kind == "cap" else REF, nom if nom.endswith(".png") else nom + ".png")
    im = Image.open(p).convert("RGB")
    print(f"  [ouvert] {kind}/{os.path.basename(p)} taille={im.size}")
    return im

def cssx(px):  # px image -> px CSS
    return px / K

def med(im, x0, y0, x1, y1):
    """Médiane par canal d'une fenêtre (aplat). Bornes incluses-exclues."""
    px = list(im.crop((x0, y0, x1, y1)).getdata())
    if not px:
        return None
    n = len(px)
    out = []
    for c in range(3):
        v = sorted(p[c] for p in px)
        out.append(v[n // 2])
    return tuple(out), n

def lum(rgb):
    """Luminance relative WCAG."""
    def f(c):
        c = c / 255.0
        return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    r, g, b = rgb
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def contraste(a, b):
    la, lb = lum(a), lum(b)
    hi, lo = max(la, lb), min(la, lb)
    return (hi + 0.05) / (lo + 0.05)

def vue(im, box, nom, zoom=1):
    """Sauve un recadrage (pour inspection visuelle) et dit où."""
    c = im.crop(box)
    if zoom != 1:
        c = c.resize((int(c.width * zoom), int(c.height * zoom)), Image.LANCZOS)
    p = os.path.join(OUT, nom)
    c.save(p)
    print(f"  [vue] {p} box={box} -> {c.size}")
    return p
