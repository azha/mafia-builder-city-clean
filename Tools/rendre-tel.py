#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Rend UN téléphone (`.cadre` d'index N) d'une page d'écrans de l'atelier en PNG canon, isolé et recadré.

Usage : rendre-tel.py <page.html> <index-cadre (0-based)> <sortie.png> [echelle=3]

Produit un PNG de (300 × 583,33) CSS × échelle = 900×1750 à ×3 — le format des canons de
`Tools/juge-visuel/<ecran>/ecran-canon.png` (le `.tel` de l'atelier fait `width:300px;aspect-ratio:9/17.5`).

Ce que ce script fait, et pourquoi :
- il n'édite PAS la page : il écrit une copie temporaire à côté (même dossier ⇒ mêmes chemins
  relatifs, mêmes data-URI), avec une feuille de style injectée qui MASQUE tout sauf le cadre N,
  supprime les marges de la page et colle le téléphone en (0,0) ;
- il délègue le rendu à `rendre-maquette.py` (fenêtre plus grande que le contenu + assertion
  « non rogné ») — le piège du crop silencieux de Chrome est déjà payé ici deux fois ;
- il recadre ensuite à la géométrie du téléphone et ASSERTE la taille de sortie.
"""
import os, sys, re, tempfile, subprocess

TEL_W_CSS = 300
TEL_H_CSS = 584  # aspect-ratio 9/17.5 ⇒ 583,33 ; les canons existants font 900×1752 = 584 × 3

def main():
    page, idx, sortie = sys.argv[1], int(sys.argv[2]), sys.argv[3]
    ech = int(sys.argv[4]) if len(sys.argv) > 4 else 3
    html = open(page, encoding="utf-8").read()
    n_cadres = len(re.findall(r'class="cadre"', html))
    if not (0 <= idx < n_cadres):
        print(f"⛔ index {idx} hors de [0,{n_cadres})"); sys.exit(2)
    # nth-of-type ne compte que les frères de même TAG : les .cadre sont des <div> frères dans .rangee,
    # mais plusieurs .rangee peuvent coexister ⇒ on numérote nous-mêmes par un attribut data-tel.
    k = [0]
    def tag(m):
        s = m.group(0); i = k[0]; k[0] += 1
        return s.replace('class="cadre"', f'class="cadre" data-tel="{i}"')
    html2 = re.sub(r'<div class="cadre">', tag, html)
    injecte = f"""
<style id="isolation">
  html,body{{margin:0!important;padding:0!important;background:#0b1016!important;overflow:hidden!important}}
  .page{{max-width:none!important;margin:0!important;padding:0!important}}
  header.bandeau,.annexes,.etiquette{{display:none!important}}
  .rangee{{display:block!important;margin:0!important;gap:0!important}}
  .cadre{{display:none!important;margin:0!important}}
  .cadre[data-tel="{idx}"]{{display:block!important;position:absolute!important;left:0!important;top:0!important}}
  .cadre[data-tel="{idx}"] .tel{{width:{TEL_W_CSS}px!important;margin:0!important;box-shadow:none!important}}
</style></head>"""
    html2 = html2.replace("</head>", injecte, 1) if "</head>" in html2 else injecte + html2
    tmp = os.path.join(os.path.dirname(os.path.abspath(page)), f".tmp-rendre-tel-{idx}.html")
    open(tmp, "w", encoding="utf-8").write(html2)
    try:
        ici = os.path.dirname(os.path.abspath(__file__))
        brut = sortie + ".brut.png"
        r = subprocess.run([sys.executable, os.path.join(ici, "rendre-maquette.py"), tmp, brut,
                            str(TEL_W_CSS), str(int(TEL_H_CSS) + 1), str(ech)], capture_output=True, text=True)
        print(r.stdout.strip())
        if r.returncode != 0:
            print(r.stderr[-600:]); sys.exit(r.returncode)
        from PIL import Image
        im = Image.open(brut)
        w, h = round(TEL_W_CSS * ech), round(TEL_H_CSS * ech)
        im.crop((0, 0, w, h)).save(sortie)
        os.remove(brut)
        out = Image.open(sortie)
        assert out.size == (w, h), out.size
        # anti-vacuité : un téléphone rendu n'est pas noir
        px = out.convert("L").resize((64, 128)).getdata()
        clair = sum(1 for v in px if v > 24) / len(px)
        print(f"sortie  : {out.size[0]}x{out.size[1]}  pixels non noirs : {clair:.0%}")
        if clair < 0.05:  # seuil du skill juge-visuel (≥ 5 % non noirs) — un écran sombre légitime tombe à ~20 %
            print("⛔ rendu quasi noir — le cadre visé n'a pas rendu"); sys.exit(3)
    finally:
        if os.path.exists(tmp): os.remove(tmp)

if __name__ == "__main__":
    main()
