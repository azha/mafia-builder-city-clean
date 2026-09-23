#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Ce que le back SERT à un écran, champ par champ, et ce que le code de l'écran en LIT — la base d'une maquette « autour des données
servies » (ARBITRAGES 07/09 points 2 et 19 : jamais un libellé sans source).

Entrée : les CORPS RÉELS du dossier de juge (`Tools/juge-visuel/<dossier>/corps-reels/*.json`, GET en 2xx seulement — pris sur la pile
dev, compte de démo ; la provenance voyage avec chaque fichier et est recopiée en tête), et le DOSSIER DE CODE du contrôleur dans l'arbre
client (tous les `.cs` du dossier : c'est aussi le périmètre des routes des corps).
Pour chaque champ feuille : son chemin, une valeur d'exemple (et les valeurs distinctes vues dans un tableau — les bandes), et « lu ? » :
le nom du champ apparaît-il dans le code du dossier HORS de sa déclaration de DTO (`public <type> <champ>;`) et hors commentaire ?
⚠️ « lu » veut dire LU PAR LE CODE, pas DESSINÉ : c'est une borne. Un champ « non lu » est une question « passé à côté ? », pas un défaut.
Contrôles : le lecteur de corps relit une route connue ; un champ inventé n'est jamais « lu ».
Usage : inventaire-donnees-servies.py <dossier-juge> <chemin/du/Controleur.cs> [--fichier-seul] [--aussi a.cs,b.cs] [--post nom] [--client <arbre>] [--sortie <fichier.md>]"""
import glob, json, os, re, subprocess, sys

JV = '/home/erutheone/project/mafia-unity-DA/Tools/juge-visuel'
arg = lambda n, d: sys.argv[sys.argv.index(n) + 1] if n in sys.argv else d
DOSSIER, CTL = sys.argv[1], sys.argv[2]
ARBRE = arg('--client', '/home/erutheone/project/mafia-unity-F')
SHA = subprocess.run(['git', '-C', ARBRE, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()

def sans_commentaires(t):
    return re.sub(r'("(?:\\.|[^"\\\n])*")|//[^\n]*|/\*[\s\S]*?\*/', lambda m: m.group(1) or '', t)
dossier_code = os.path.dirname(os.path.join(ARBRE, CTL))
code = ''
# `--fichier-seul` : le seul fichier du contrôleur (deux écrans qui partagent un dossier — ⑪ et ⑫ — ne se distinguent pas autrement)
# `--aussi <f1.cs,f2.cs>` : d'autres fichiers du même écran hors de son dossier (④ : les panneaux de l'ouverture de session, `front.md` §4 B)
AUSSI = [os.path.join(ARBRE, x) for x in arg('--aussi', '').split(',') if x]
for f in ([os.path.join(ARBRE, CTL)] if '--fichier-seul' in sys.argv else sorted(glob.glob(os.path.join(dossier_code, '*.cs')))) + AUSSI:
    t = sans_commentaires(open(f, encoding='utf-8', errors='replace').read())
    code += re.sub(r'public\s+[\w<>\[\],\s]+?\s+(\w+)\s*;', ' ', t)          # les déclarations de DTO ne comptent pas comme une lecture

def lu(champ): return re.search(r'(?<![\w])' + re.escape(champ) + r'(?![\w])', code) is not None
assert not lu('champ_invente_que_personne_ne_lit'), 'contrôle négatif'

def feuilles(v, chemin=''):
    if isinstance(v, dict):
        for k, x in v.items(): yield from feuilles(x, f'{chemin}.{k}' if chemin else k)
    elif isinstance(v, list):
        if v and all(not isinstance(x, (dict, list)) for x in v): yield (chemin + '[]', v)
        for x in v[:50]: yield from feuilles(x, chemin + '[]')
    else: yield (chemin, v)

lignes, compte = [], {'lu': 0, 'non lu': 0}
corps = sorted(glob.glob(os.path.join(JV, DOSSIER, 'corps-reels', 'GET_*.json')))
# `--post <nom>` : une route POST qui est une LECTURE pour l'écran (④ : `POST /v1/session/open`, ce que l'Accueil affiche)
corps += [os.path.join(JV, DOSSIER, 'corps-reels', f'POST_{x}.json') for x in arg('--post', '').split(',') if x]
assert corps, f'aucun corps GET dans {DOSSIER}'
prov = json.load(open(corps[0], encoding='utf-8')).get('provenance', {})
for f in corps:
    d = json.load(open(f, encoding='utf-8'))
    if not (200 <= int(d.get('statut', 0)) < 300): continue
    vus = {}
    for ch, v in feuilles(d['corps']):
        if ch.startswith('response_meta') or '.response_meta' in ch: continue      # le transport (id de requête, SHA) n'est pas une donnée de jeu
        ch = re.sub(r'^payload\.data\.?', '', ch) or '(racine)'
        vus.setdefault(ch, [])
        s = json.dumps(v, ensure_ascii=False) if not isinstance(v, str) else v
        if s not in vus[ch] and len(vus[ch]) < 6: vus[ch].append(s[:40])
    lignes += ['', f"### `{d['methode']} {d['route']}` — {len(vus)} champs", '', '| champ | exemple(s) servi(s) | lu par le code de l\'écran ? |', '|---|---|---|']
    for ch, ex in vus.items():
        nom = re.sub(r'\[\]', '', ch.split('.')[-1]) or ch
        if nom in ('envelope', 'request_id', 'server_time', 'meta'): continue
        l = lu(nom); compte['lu' if l else 'non lu'] += 1
        lignes.append(f"| `{ch}` | {' · '.join(ex)} | {'oui' if l else '**non — passé à côté ?**'} |")
tete = [f'## Données servies — `{DOSSIER}` (`{os.path.basename(CTL)}`)', '',
        f"> Corps réels : back servi `{prov.get('back_served')}` (main `{prov.get('back_main')}`), {prov.get('date')}, compte `{prov.get('compte')}`. "
        f"Code : `{os.path.relpath(os.path.join(ARBRE, CTL), ARBRE) if '--fichier-seul' in sys.argv else os.path.relpath(dossier_code, ARBRE) + '/*.cs'}` à `{SHA}` (arbre `{os.path.basename(ARBRE)}`). « lu » = lu par le code, pas dessiné.",
        f"> **{compte['lu']} champs lus · {compte['non lu']} non lus** (chaque non-lu est une question « passé à côté ? »)."]
texte = '\n'.join(tete + lignes) + '\n'
if '--sortie' in sys.argv: open(arg('--sortie', ''), 'w', encoding='utf-8').write(texte)
print(f"{DOSSIER} : {compte['lu']} lus · {compte['non lu']} non lus · {len(corps)} corps · back servi {prov.get('back_served')}")
