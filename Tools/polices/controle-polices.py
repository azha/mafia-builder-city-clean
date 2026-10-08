#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Contrôle positif du réglage DejaVu (ARBITRAGES-user-2026-09-07 point 18), à passer AVANT tout rendu de référence.

1. `fc-match` sous `fonts-dejavu.conf` rend DejaVu pour Georgia, serif, Segoe UI, Roboto, system-ui, sans-serif (et Noto sans lui) ;
2. un rendu témoin par la VRAIE chaîne (`Tools/rendre-maquette.py`, Chrome) : la chasse à l'encre de deux lignes (Georgia ; Segoe UI)
   doit valoir la chasse DejaVu calculée par PIL à ±3 px, et différer de plus de 10 px du rendu sans réglage (`POLICES=systeme`).
Mesuré le 2026-09-23 : sans réglage, Chrome rend Georgia en **Liberation Serif** (sa police serif par défaut, 526 px), et non en
Noto Serif comme `fc-match` le dit ; Segoe UI en Noto Sans. Réglé : DejaVu à 1 px près.
Usage : python3 Tools/polices/controle-polices.py   (sortie 0 = réglage prouvé ; 1 = arrêter, ne rien rendre)"""
import os, subprocess, sys, tempfile
from PIL import Image, ImageFont, ImageDraw
ICI = os.path.dirname(os.path.abspath(__file__)); CONF = os.path.join(ICI, 'fonts-dejavu.conf')
RENDRE = os.path.join(ICI, '..', 'rendre-maquette.py'); D = '/usr/share/fonts/truetype/dejavu/'
defauts = []
for fam, attendu in (('Georgia', 'DejaVu Serif'), ('serif', 'DejaVu Serif'), ('Segoe UI', 'DejaVu Sans'), ('Roboto', 'DejaVu Sans'),
                     ('system-ui', 'DejaVu Sans'), ('sans-serif', 'DejaVu Sans')):
    vu = subprocess.run(['fc-match', '-f', '%{family}', fam], capture_output=True, text=True, env=dict(os.environ, FONTCONFIG_FILE=CONF)).stdout
    print(f'fc-match {fam:10} → {vu}'); defauts += [] if vu.split(',')[0] == attendu else [f'fc-match {fam} → {vu}']
tmp = tempfile.mkdtemp()
def rendu(nom, systeme):
    env = dict(os.environ, **({'POLICES': 'systeme'} if systeme else {}))
    out = os.path.join(tmp, nom)
    subprocess.run([sys.executable, RENDRE, os.path.join(ICI, 'temoin-polices.html'), out, '900', '120', '1'], env=env, capture_output=True, check=True)
    return Image.open(out).convert('L')
def encre(im, y0, y1):
    bb = im.crop((0, y0, im.size[0], y1)).point(lambda v: 255 if v < 128 else 0).getbbox(); return bb[2] - bb[0]
def pil(font, txt):
    im = Image.new('L', (1400, 80), 0); ImageDraw.Draw(im).text((10, 10), txt, font=ImageFont.truetype(font, 40), fill=255)
    bb = im.getbbox(); return bb[2] - bb[0]
r, s = rendu('regle.png', False), rendu('systeme.png', True)
for txt, y0, y1, f in (("Le Verge d'Or — HEAT LOCAL", 0, 60, D + 'DejaVuSerif.ttf'), ("COLLECTER · REVENUS · Famille", 60, 120, D + 'DejaVuSans.ttf')):
    cr, cs, pd = encre(r, y0, y1), encre(s, y0, y1), pil(f, txt)
    ok = abs(cr - pd) <= 3 and abs(cs - pd) > 10
    print(f'« {txt} » : réglé {cr} px · DejaVu (PIL) {pd} px · sans réglage {cs} px  ' + ('✅' if ok else '⛔'))
    if not ok: defauts.append(txt)
print('CONTRÔLE POSITIF :', 'OK — DejaVu prouvé dans Chrome' if not defauts else '⛔ ÉCHEC — ne rien rendre')
sys.exit(1 if defauts else 0)
