#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""㊵ cadre 138 : l'étiquette « écart » passe de la 3ᵉ étape (« Le garage ») à la TÊTE (« Le comptoir »).
Mesure de CLIENT-1 (23/09, créneau de 06:20, corps réel du compte semé) : `GET /v1/operational/laundering/{node}` ne sert QUE le nœud de tête ;
les trois autres rendent 404 « is not a player-owned Stage-1 laundering node ». `deviation_active` est donc UN drapeau de filière, porté par la
tête (l'épingle d'audit de la façade hôte), pas un drapeau par étape. La maquette montrait une donnée que le serveur ne peut pas dire (règle :
jamais inventer une donnée) ; le client pose « écart » sur la tête seule, et « ÉCARTS » vaut 0 ou 1 — le compteur « 01 écarts » du cadre tient.
Ce qui bouge : la classe `alerte` et `<span class="dv">écart</span>`, de l'étape « Le garage » à l'étape « Le comptoir », dans le cadre 138
seulement. Compte ATTENDU : 1 déplacement par page (série 6, série 6 sans pastilles) ; idempotent (une page déjà passée rend 0). Aucun rendu.
Usage : ecart-tete-138-2026-09-23.py [--controle | --ecrire]"""
import os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
PAGES = ('ecrans-brennar-6.html', 'ecrans-brennar-6-sans-pastilles.html')
AVANT_TETE = '<div class="et6"><div class="cuve"><u style="height:25%;background:#ff5a4d;opacity:.85"></u></div><div><b>Le comptoir</b><span>node · dirty</span></div><span class="pr" style="color:#ff5a4d">sale</span></div>'
APRES_TETE = '<div class="et6 alerte"><div class="cuve"><u style="height:25%;background:#ff5a4d;opacity:.85"></u></div><div><b>Le comptoir</b><span>node · dirty</span></div><span class="pr" style="color:#ff5a4d">sale</span><span class="dv">écart</span></div>'
AVANT_3 = '<div class="et6 alerte"><div class="cuve"><u style="height:75%;background:#f2c96b;opacity:.85"></u></div><div><b>Le garage</b><span>node · mostly_clean</span></div><span class="pr" style="color:#f2c96b">presque propre</span><span class="dv">écart</span></div>'
APRES_3 = '<div class="et6"><div class="cuve"><u style="height:75%;background:#f2c96b;opacity:.85"></u></div><div><b>Le garage</b><span>node · mostly_clean</span></div><span class="pr" style="color:#f2c96b">presque propre</span></div>'

def passer(s):
    c = [m.start() for m in re.finditer(r'<div class="cadre">', s)] + [len(s)]
    f = s[c[138]:c[139]]
    assert 'La filière s’écarte de son profil' in f, 'le cadre 138 n’est plus celui de l’écart'
    if f.count(AVANT_3) == 0 and f.count(APRES_TETE) == 1: return s, 0          # déjà passé
    assert f.count(AVANT_3) == 1 and f.count(AVANT_TETE) == 1, 'le cadre 138 a bougé'
    f = f.replace(AVANT_3, APRES_3).replace(AVANT_TETE, APRES_TETE)
    return s[:c[138]] + f + s[c[139]:], 1

def main():
    ecrire = '--ecrire' in sys.argv; d = 0
    for nom in PAGES:
        p = os.path.join(ATELIER, nom); s = open(p, encoding='utf-8').read()
        try:
            t, n = passer(s)
        except AssertionError as e:
            print(f'  ⛔ {nom} : {e}'); d += 1; continue
        if ecrire and n:
            open(p, 'w', encoding='utf-8').write(t); assert passer(t)[1] == 0
        print(f'  {nom:40} {n}' + (' écrit' if ecrire and n else '' if not n else ' à écrire'))
    print(f'{d} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
