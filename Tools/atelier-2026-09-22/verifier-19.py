#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Vérifie `19-en-24-cles.md` : l'ensemble de clés == (table BundleReel `d69e64d1` l.29-48, moins les clés servies par le back à `8c83da27`)
∪ (les 6 de ⑨ nommées par l'orchestrateur, présentes dans la table de CLIENT-2) ; chaque fr (apostrophe ’ ramenée à ') présent tel quel dans
le code client (cumul `14eb2454`, ou arbre F `HEAD` pour les clés de ⑨) ; en ≠ fr ; même nombre de `\\n` ; aucune clé déjà servie en fr.
Et la section `error.*` : ses clés == celles que le bundle fr du back (`f97a138d`) sert au repli ou avec fr == en, mesurées par nom."""
import re, subprocess, sys, os
ICI = os.path.dirname(os.path.abspath(__file__)); DOC = os.path.join(ICI, '19-en-24-cles.md')
DA, F, BACK = '/home/erutheone/project/mafia-unity-DA', '/home/erutheone/project/mafia-unity-F', '/home/erutheone/project/mafia-back-suite'
sh = lambda d, *a: subprocess.run(['git', '-C', d, *a], capture_output=True, text=True).stdout
table = sh(DA, 'show', 'd69e64d1:Tools/juge-donnees/i18n/bundle-reel-construction-2026-09-23.md').split('\n')
t18 = [re.match(r'- `([a-z0-9_.]+)`', l).group(1) for l in table[28:48] if re.match(r'- `([a-z0-9_.]+)`', l)]
src = sh(BACK, 'show', '8c83da27:services/game-back/src/i18n/string_table.ts')
d = src.index('export const FR_MESSAGES'); f = src.index('\n};', d)
servies = set(re.findall(r"^  '([a-z0-9_.]+)':", src[d:f], re.M))
dix_huit = [k for k in t18 if k not in servies]
six = ['exceptions.bloc.ouvrir_sa_main', 'exceptions.bloc.suggere_appui_long_sa_main', 'exceptions.bloc.autre_issue',
       'exceptions.bloc.autres_issues', 'exceptions.locuteur.votre_lieutenant', 'exceptions.bloc.le_comptoir_n_a_pas_repondu']
tf = open(os.path.join(F, 'Tools/juge-donnees/exceptions/i18n-2026-09-23.md'), encoding='utf-8').read()
defauts = [f'{k} absente de la table de CLIENT-2' for k in six if f'`{k}`' not in tf]
attendu = set(dix_huit) | set(six)
doc = open(DOC, encoding='utf-8').read(); mien = {}
sections = {t.split('\n', 1)[0]: t for t in doc.split('\n## ')[1:]}
for l in sections['Les 23 clés'].split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; mien[c[0].strip('`')] = (c[1], c[2])
if set(mien) != attendu: defauts.append(f'ensembles : en trop {set(mien) - attendu} ; manquantes {attendu - set(mien)}')
code_cumul = sh(DA, 'grep', '-h', '-F', '', '14eb2454', '--', 'Assets/Scripts')
code_f = sh(F, 'grep', '-h', '-F', '', 'HEAD', '--', 'Assets/Scripts')
assert 'phrase inventée que personne n’écrit' not in code_cumul + code_f and "Le conflit n'a pas répondu" in code_cumul, 'contrôles positif/négatif du corpus'
for k, (fr, en) in mien.items():
    lit = fr.replace('’', "'")
    if lit not in code_cumul and lit not in code_f: defauts.append(f'{k} : fr {lit!r} introuvable dans le code client')
    if fr == en: defauts.append(f'{k} : en == fr')
    if fr.count('\\n') != en.count('\\n'): defauts.append(f'{k} : sauts de ligne différents')
    if k in servies: defauts.append(f'{k} : déjà servie à 8c83da27')
print(f'18 relevées (BundleReel − servies) : {len(dix_huit)} ; 6 de ⑨ ; union attendue {len(attendu)} ; table {len(mien)}')
# ── `error.*` servies en anglais dans le bundle fr (ajout du 2026-09-23) : l'ensemble de la section == les clés que `resolveBundle('fr')` du back
# (`f97a138d`) sert par le REPLI d'humanisation ou avec fr == en ; mesuré PAR NOM dans chaque registre (ERROR_CODES, ERROR_TEXT_RATIFIED en/fr,
# EN_MESSAGES, FR_MESSAGES). Le « servi aujourd'hui » de la table doit être la valeur réellement servie ; le « à servir » ≠ en, ≠ repli.
REV = 'f97a138d'
st = sh(BACK, 'show', f'{REV}:services/game-back/src/i18n/string_table.ts'); ec = sh(BACK, 'show', f'{REV}:services/game-back/src/protocol/error-codes.ts')
codes = re.findall(r"user_facing_i18n_key:\s*'([^']+)'", ec)
def bloc(nom, txt=st): d = txt.index(nom); return txt[d:txt.index('\n};', d)]
def lire(txt):
    return {m.group(1): ''.join(re.findall(r"'((?:[^'\\]|\\.)*)'", m.group(2))).replace("\\'", "'")
            for m in re.finditer(r"^\s*'([a-z0-9_.]+)':\s*\n?\s*((?:'(?:[^'\\]|\\.)*'\s*\+?\s*)+),", txt, re.M)}
EN, FR = lire(bloc('export const EN_MESSAGES')), lire(bloc('export const FR_MESSAGES'))
r = bloc('const ERROR_TEXT_RATIFIED'); ren, rfr = lire(r[r.index('  en: {'):r.index('  fr: {')]), lire(r[r.index('  fr: {'):])
assert rfr['error.resource.not_found'] == 'Ce n\'est plus là.' and ren['error.resource.not_found'] == 'That is no longer there.', 'contrôle positif du lecteur'
assert len(ren) >= 60 and len(rfr) >= 60, f'lecteur : {len(ren)}/{len(rfr)} textes ratifiés lus'
hum = lambda k: (lambda w: w[:1].upper() + w[1:] + '.')(k.split('.')[-1].replace('_', ' '))
servi = {}
for k in set(codes) | {k for k in {**EN, **FR} if k.startswith('error.')}:
    en = EN.get(k, ren.get(k, hum(k))); fr = FR.get(k, EN.get(k, rfr.get(k, hum(k))))
    servi[k] = (fr, en, k not in FR and k not in EN and k not in rfr)
fautives = {k for k, (fr, en, repli) in servi.items() if repli or fr == en}
assert 'error.resource.not_found' not in fautives, 'contrôle négatif : une clé ratifiée ne doit pas sortir'
err = {}
for l in sections[next(t for t in sections if t.startswith('`error.*`'))].split('\n'):
    if l.startswith('| `'):
        c = [x.strip() for x in l.strip().strip('|').split('|')]; err[c[0].strip('`')] = c[1:5]
if set(err) != fautives: defauts.append(f'error.* : en trop {set(err) - fautives} ; manquantes {fautives - set(err)}')
for k, (fr_auj, fr, en_auj, en) in err.items():
    if k not in servi: continue
    if (fr_auj, en_auj) != servi[k][:2]: defauts.append(f'{k} : « servi aujourd\'hui » {(fr_auj, en_auj)} ≠ back {servi[k][:2]}')
    if fr == en or fr == hum(k) or en == hum(k): defauts.append(f'{k} : fr == en, ou texte de repli')
    if not re.search(r'\. [A-ZÉ]', fr) or not re.search(r'\. [A-Z]', en): defauts.append(f'{k} : pas en deux temps (constat, puis geste) comme les ratifiés')
print(f'error.* à {REV} : {len(codes)} codes, {len(rfr)} fr ratifiés, {sum(k.startswith("error.") for k in EN)} + {sum(k.startswith("error.") for k in FR)} surcharges ; fautives {sorted(fautives)} ; table {sorted(err)}')
for x in defauts: print('  ⛔', x)
print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)
