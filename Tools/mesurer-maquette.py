#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Mesure la géométrie RÉELLE d'une maquette HTML, par le navigateur qui la rend.

⛔ POURQUOI CET OUTIL PLUTÔT QU'UNE LECTURE DU CSS. Additionner des paddings donne un
nombre plausible et faux : `.fiche` a été estimée à 112 px CSS par ce chemin, elle en fait
169,19 — et les 34 % manquants tranchaient les trois boutons d'action, sans une erreur.
Les interlignes, les marges qui fusionnent et les `flex` ne se calculent pas de tête.

⛔ ET POURQUOI PAS UNE MESURE SUR LE PNG. Essayé d'abord : compter les pixels sombres par
ligne pour trouver le bas de la fiche. L'instrument a rendu « la fiche descend jusqu'au bord
de l'écran » — parce que le dégradé du dock, JUSTE EN DESSOUS, est sombre lui aussi. Un
verdict uniforme est le premier signe qu'on mesure autre chose que ce qu'on croit.

Usage: mesurer-maquette.py <fichier.html> <selecteur-racine> <sel1> <sel2> ...
"""
import subprocess, sys, os, json, io, re, tempfile

def mesurer(html, racine, selecteurs):
    src = io.open(html, encoding="utf-8").read()
    src += """
<script>window.addEventListener('load',function(){
  var t=document.querySelector(%s).getBoundingClientRect();
  var o={__racine:[+t.width.toFixed(2),+t.height.toFixed(2)]};
  %s.forEach(function(sel){
    var e=document.querySelector(sel); if(!e){o[sel]=null;return}
    var r=e.getBoundingClientRect();
    o[sel]=[+r.width.toFixed(2),+r.height.toFixed(2),
            +(r.left-t.left).toFixed(2),+(r.top-t.top).toFixed(2)];
  });
  document.title='MESURE'+JSON.stringify(o);
});</script>
""" % (json.dumps(racine), json.dumps(selecteurs))
    tmp = tempfile.NamedTemporaryFile("w", suffix=".html", delete=False, encoding="utf-8")
    tmp.write(src); tmp.close()
    out = subprocess.run(
        ["/usr/bin/google-chrome", "--headless=new", "--disable-gpu",
         "--window-size=480,1200", "--dump-dom", "file://" + tmp.name],
        capture_output=True, text=True, timeout=180).stdout
    os.unlink(tmp.name)
    m = re.search(r"MESURE(\{.*?\})<", out, re.S)
    if not m:
        print("⛔ aucune mesure — le script de page n'a pas tourné", file=sys.stderr); sys.exit(1)
    d = json.loads(m.group(1))
    # ⛔ CONTRÔLE POSITIF : un sélecteur absent rend `null`, pas une erreur. Sans ce compte,
    # une faute de frappe dans un sélecteur produirait un tableau plus court — et vert.
    manquants = [k for k, v in d.items() if v is None]
    print(f"racine {racine} : {d['__racine'][0]} x {d['__racine'][1]} px CSS")
    for sel in selecteurs:
        v = d.get(sel)
        if v is None:
            print(f"  {sel:26s} ⛔ INTROUVABLE")
        else:
            print(f"  {sel:26s} {v[0]:8.2f} x {v[1]:7.2f}  à ({v[2]:7.2f}, {v[3]:8.2f})")
    if manquants:
        print(f"⛔ {len(manquants)} sélecteur(s) introuvable(s) — la mesure est INCOMPLÈTE", file=sys.stderr)
        sys.exit(2)
    return d

if __name__ == "__main__":
    mesurer(sys.argv[1], sys.argv[2], sys.argv[3:])
