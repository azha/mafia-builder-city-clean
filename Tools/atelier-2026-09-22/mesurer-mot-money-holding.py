#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Quel mot pour `money_holding` ? — les emplois de chaque candidat dans les TROIS supports, texte affiché seulement.

Critère (orchestrateur, 2026-09-22) : le mot est compris sans glossaire ET n'a AUCUN autre emploi dans le corpus.
Contrôle positif d'abord : « caisse » doit rendre ses emplois dealer (sinon l'instrument ne voit pas le corpus).

Supports, figés par leur SHA (jamais l'arbre de travail) :
  - maquettes : `atelier3d-mafia` (pages d'écrans + HUD) — nœuds de TEXTE seulement (hors <script>, <style>, commentaires,
    attributs : une classe CSS `.coffre` n'est pas un mot lu par le joueur) ;
  - client : `Assets/Scripts` — LITTÉRAUX de chaîne seulement, commentaires retirés (un mot en commentaire n'atteint personne) ;
  - back : `services/game-back/src/i18n/string_table.ts` — LITTÉRAUX de chaîne (les valeurs du registre ; les clés sont
    comptées à part, un nom de clé n'est pas lu par le joueur).

Usage : mesurer-mot-money-holding.py <sha-atelier> <sha-client> <sha-back> [mot ...]
"""
import re, subprocess, sys, collections

ATELIER = '/home/erutheone/project/atelier3d-mafia'
CLIENT = '/home/erutheone/project/mafia-unity-DA'
BACK = '/home/erutheone/project/mafia-clean-city'
PAGES = ['ecrans-brennar-6.html', 'ecrans-brennar-4.html', 'ecrans-brennar.html', 'hud-brennar.html']

def show(depot, sha, chemin):
    return subprocess.run(['git', '-C', depot, 'show', f'{sha}:{chemin}'], capture_output=True, text=True).stdout

def fichiers(depot, sha, racine, suffixe):
    out = subprocess.run(['git', '-C', depot, 'ls-tree', '-r', '--name-only', sha, '--', racine], capture_output=True, text=True).stdout
    return [f for f in out.split('\n') if f.endswith(suffixe)]

def motif(mot):
    # formes : singulier/pluriel, et « coffre-fort(s) » compté À PART de « coffre » (le trait d'union fait un autre mot)
    return re.compile(r"(?<![\w-])" + re.escape(mot) + r"s?(?![\w-])", re.I)

def _sans_commentaires():
    """Le retrait de commentaires de `Tools/chaines-joueur.py` : il avance les littéraux ("…" et '…') avant de chercher
    `//` ou `/*`, positions préservées — réutilisé, pas réécrit (un second lexer serait une seconde vérité)."""
    import importlib.util, os
    spec = importlib.util.spec_from_file_location('cj', os.path.join(CLIENT, 'Tools', 'chaines-joueur.py'))
    cj = importlib.util.module_from_spec(spec); spec.loader.exec_module(cj)
    return cj.sans_commentaires

SANS_COMMENTAIRES = _sans_commentaires()

def litteraux(s):
    return re.findall(r'\$?@?"((?:[^"\\]|\\.)*)"', s)

def textes_html(s):
    idx = [m.start() for m in re.finditer(r'class="cadre"', s)] + [len(s)]
    prelude = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', '', s[:idx[0]], flags=re.S)
    yield ('hors cadre', ' '.join(t.strip() for t in re.split(r'<[^>]*>', prelude) if t.strip()))
    etq = re.findall(r'<div class="etiquette">(.*?)</div>', s)
    for i in range(len(idx) - 1):
        seg = re.sub(r'<script.*?</script>|<style.*?</style>|<!--.*?-->', '', s[idx[i]:idx[i + 1]], flags=re.S)
        yield (f'cadre {i} « {etq[i] if i < len(etq) else "?"} »', ' '.join(t.strip() for t in re.split(r'<[^>]*>', seg) if t.strip()))

def contexte(txt, m, n=55):
    a, b = max(0, m.start() - n), min(len(txt), m.end() + n)
    return txt[a:b].replace('\n', ' ')

def mesurer(mot, sha_at, sha_cl, sha_bk):
    rx = motif(mot); res = collections.OrderedDict()
    # maquettes
    lignes = []
    for p in PAGES:
        s = show(ATELIER, sha_at, p)
        for ou, txt in textes_html(s):
            for m in rx.finditer(txt):
                lignes.append(f'{p} · {ou} : …{contexte(txt, m)}…')
    res['maquettes'] = lignes
    # client
    lignes = []
    for f in fichiers(CLIENT, sha_cl, 'Assets/Scripts', '.cs'):
        s = SANS_COMMENTAIRES(show(CLIENT, sha_cl, f))
        for n, l in enumerate(s.split('\n'), 1):
            for lit in litteraux(l):
                for m in rx.finditer(lit):
                    lignes.append(f'{f.replace("Assets/Scripts/", "")}:{n} : « {lit[:110]} »')
    res['client'] = lignes
    # back
    lignes = []
    s = show(BACK, sha_bk, 'services/game-back/src/i18n/string_table.ts')
    s = SANS_COMMENTAIRES(s)
    for n, l in enumerate(s.split('\n'), 1):
        for lit in re.findall(r"'((?:[^'\\]|\\.)*)'", l):
            if re.fullmatch(r'[a-z0-9_.]+', lit):
                continue                                   # une clé, pas un texte lu
            for m in rx.finditer(lit):
                lignes.append(f'string_table.ts:{n} : « {lit[:110]} »')
    res['back'] = lignes
    return res

def main():
    sha_at, sha_cl, sha_bk = sys.argv[1:4]
    mots = sys.argv[4:] or ['caisse', 'coffre', 'coffre-fort', 'officine', 'banque']
    print(f'supports : atelier {sha_at} · client {sha_cl} · back {sha_bk}\n')
    for mot in mots:
        r = mesurer(mot, sha_at, sha_cl, sha_bk)
        total = sum(len(v) for v in r.values())
        print(f'=== « {mot} » : {total} emploi(s) — maquettes {len(r["maquettes"])} · client {len(r["client"])} · back {len(r["back"])}')
        for support, lignes in r.items():
            for l in lignes[:40]:
                print(f'  [{support}] {l}')
            if len(lignes) > 40:
                print(f'  [{support}] … {len(lignes) - 40} de plus')
        print()

if __name__ == '__main__':
    main()
