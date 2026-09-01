#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Temps 5 — stabilité : compte les pixels différents entre la capture T et la
capture T+1 s (même résolution). Un nouvel écran est SANS animation.

CONTRÔLE POSITIF : la même image comparée à elle-même doit donner 0 pixel.
CONTRÔLE NÉGATIF : la capture 1080x1920 comparée à un décalage d'elle-même de
1 px doit donner un compte NON nul (sinon le comparateur ne discrimine rien).
"""
from PIL import Image, ImageChops

A = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920.png"
B = "/home/erutheone/project/mafia-unity-B/Assets/Screenshots/screen_b3_reputation_1080x1920_t1s.png"


def diff(im1, im2, seuil=0):
    d = ImageChops.difference(im1, im2).convert("L")
    h = d.histogram()
    n = sum(h[seuil + 1:])
    return n, d.getbbox()


def main():
    a = Image.open(A).convert("RGB")
    b = Image.open(B).convert("RGB")
    print(f"T    {A} {a.size}")
    print(f"T+1s {B} {b.size}")
    n, bb = diff(a, b)
    print(f"pixels différents (Δ>0) : {n} / {a.size[0]*a.size[1]} — bbox {bb}")
    n8, _ = diff(a, b, 8)
    print(f"pixels différents (Δ>8) : {n8}")
    print(f"[ctrl positif] T contre T : {diff(a,a)[0]} pixels (attendu 0)")
    dec = ImageChops.offset(a, 1, 0)
    print(f"[ctrl négatif] T contre T décalée de 1 px : {diff(a,dec)[0]} pixels (attendu > 0)")


main()
