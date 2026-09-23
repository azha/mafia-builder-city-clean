#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Les apostrophes des maquettes : l'élision droite du TEXTE VISIBLE devient `’` (décision f2 D10 du 23/09 : `’` dans le FR servi ;
les juges classent la droite en écart). Mesure du back : 23 élisions droites dans `hud-brennar@5983267`, 2079 droites contre 839 `’` sur
les pages de l'atelier.

Ce qui est touché : une apostrophe droite ENTRE DEUX LETTRES (« l'état », « qu'il », « aujourd'hui ») dans un nœud de TEXTE.
Ce qui ne l'est jamais : les attributs (dans une balise), `<script>`, `<style>`, `<code>`, `<pre>`, les commentaires, les URL de données.
`hud-brennar.html` n'est PAS édité (source ratifiée, jamais modifiée) : son canon dérivé (`hud-brennar-canon.html`) et les pages
générées (⑦, ④) passent par `normaliser()` à leur génération — sinon la prochaine génération défait le travail.
Comptes ATTENDUS par page, mesurés le 2026-09-23 (atelier `b4c6475`) : une page dont le compte diffère n'est pas écrite. Idempotent : une
page déjà normalisée rend 0.
Usage : apostrophes-maquettes-2026-09-23.py [--mesurer | --controle | --ecrire]"""
import glob, os, re, sys
ATELIER = os.path.expanduser('~/project/atelier3d-mafia')
EXCLUES = {'hud-brennar.html'}
PROTEGE = re.compile(r'(<script\b.*?</script>|<style\b.*?</style>|<code\b.*?</code>|<pre\b.*?</pre>|<!--.*?-->|<[^>]*>)', re.S | re.I)
ELISION = re.compile(r"(?<=[A-Za-zÀ-ÖØ-öø-ÿŒœ])'(?=[A-Za-zÀ-ÖØ-öø-ÿŒœ])")

def normaliser(html):
    """(html normalisé, nombre de remplacements) — seul le texte hors des zones protégées est touché."""
    morceaux = PROTEGE.split(html); n = 0
    for i in range(0, len(morceaux), 2):                 # indices pairs : le texte ; impairs : balises et blocs protégés
        morceaux[i], k = ELISION.subn('’', morceaux[i]); n += k
    return ''.join(morceaux), n

ATTENDU = {   # --mesurer, atelier b4c6475, 2026-09-23
    'ecrans-brennar-2.corps.html': 28,
    'ecrans-brennar-2.html': 308,
    'ecrans-brennar-3.html': 28,
    'ecrans-brennar-4.html': 14,
    'ecrans-brennar-6-sans-pastilles.html': 479,
    'ecrans-brennar-6.html': 479,
    'ecrans-brennar-7-lieutenant.html': 4,
    'ecrans-brennar-accueil.html': 11,
    'ecrans-brennar.html': 21,
    'hud-brennar-canon.html': 23,
    'inventaire-fonctionnalites.html': 46,
    'palettes-ecrans.html': 8,
    'serie4-un-par-un.html': 109,
    'serie6-matieres-sur-la-ville.html': 173,
}

def pages():
    return sorted(p for p in glob.glob(os.path.join(ATELIER, '*.html')) if os.path.basename(p) not in EXCLUES and not os.path.basename(p).startswith('.'))

def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else '--controle'
    total, defauts = 0, []
    for p in pages():
        s = open(p, encoding='utf-8').read(); t, n = normaliser(s); nom = os.path.basename(p); total += n
        if mode == '--mesurer': print(f"    '{nom}': {n},"); continue
        att = ATTENDU.get(nom)
        if n and att is None: defauts.append(f'{nom} : {n} élisions, aucun compte attendu')
        elif n and n != att: defauts.append(f'{nom} : {n} élisions, {att} attendues — la page a bougé')
        elif mode == '--ecrire' and n:
            open(p, 'w', encoding='utf-8').write(t)
            assert normaliser(t)[1] == 0, f'{nom} : non idempotent'
        print(f'  {nom:44} {n:5}' + ('' if n == 0 else (' écrit' if mode == '--ecrire' else ' à écrire')))
    print(f'total : {total}' + ('' if mode == '--mesurer' else f" · {len(defauts)} défaut(s)")); [print('  ⛔', x) for x in defauts]
    sys.exit(1 if defauts else 0)

if __name__ == '__main__':
    main()
