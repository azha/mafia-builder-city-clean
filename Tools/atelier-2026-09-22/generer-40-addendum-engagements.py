#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Addendum à la 40 (㉙, CLIENT-1 L4 — commande f2 du 23/09) : (a) les mots d'ERREUR du `POST /v1/me/engagements`,
(b) la PHRASE « La dernière fois chez eux : {issue}, et la ville a chauffé {chaleur}. » et sa famille de formes minuscules.

Mesuré au back HEAD (`operational/conflict/combat/engagements.controller.ts`, `protocol/error-codes.ts`, `common/param-pipes.ts`) :
- 409 `MUSCLE_LIEUTENANT_REQUIRED` → clé SERVIE `error.engagements.muscle_lieutenant_required` (TD-553) : on propose une VALEUR
  dans la voix de la maison, la clé reste (contrat additif) ; pas de `conflit.refus.*` en double (D12 : un mot par chose) ;
- 404 `RESOURCE_NOT_FOUND` : UN SEUL code pour TROIS cas (lieutenant pas au joueur ou inexistant — D7 « l'existence est un
  renseignement » ; clé de rival hors domaine ; rival sans `rival_state`) — ni code ni `details` ne les distinguent ⇒ UN mot ;
- 422 `VALIDATION_FAILED` (`rejected()` → `details.param`) : champ inconnu, `lieutenant_id` pas un uuid, `target_holding_id` hors
  des 5 axes. Le joueur ne SAISIT rien sur ㉙ (il touche) : un 422 est un défaut du client, dit sans jargon ⇒ UN mot ;
- échec réseau : aucun code. La route est IDEMPOTENTE (`IdempotencyInterceptor` global) ⇒ le mot dit qu'on ne sait pas si l'ordre
  est parti ET que réessayer ne l'envoie pas deux fois — VRAI seulement si le client réémet la MÊME `Idempotency-Key` (condition).
(b) Les issues servies sont en capitale (`conflit.issue.*` : Percée, Terrain gagné…) : famille `conflit.issue_phrase.*`, un mot
par issue (la casse est un mot — préférence f2) ; les chaleurs (`conflit.chaleur.*` : un peu, pas mal, beaucoup) sont DÉJÀ
minuscules et se lisent au milieu de la phrase : réutilisées, pas de famille neuve. Clé de phrase NOMMÉE (paramètres).
Contrôles (exit 1) : D17, apostrophe typographique, clés dérivées = `conflit.refus.` + slug(fr), paramètres identiques fr/en,
familles complètes (5 issues de la 40, 3 chaleurs), clé servie présente en en ET en fr (EN/FR_MESSAGES, et ERROR_TEXT_RATIFIED pour les `error.*`, chaque locale lue par son nom),
somme-table à code 0 sur la sortie.
Usage : python3 Tools/atelier-2026-09-22/generer-40-addendum-engagements.py"""
import os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
NB, NNB = ' ', ' '

def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

P, S, N = 'proposée', 'servie', 'note'
CAD = '㉙ L4'
def refus(mot, fr, en, note): return [mot, CAD, P, 'conflit.refus.' + slug(fr), fr, en, note]   # Libelle.De : slug du fr ENTIER

LIGNES = [
    ['409 MUSCLE_LIEUTENANT_REQUIRED', CAD, P, 'error.engagements.muscle_lieutenant_required',
     f'Ce lieutenant ne cogne pas. Il faut un gros bras{NB}: envoyez-en un, ou recrutez-en un.', 'This lieutenant doesn’t do the rough stuff. It takes a Muscle: send one, or recruit one.',
     'clé SERVIE (TD-553) : la VALEUR change, la clé reste (contrat additif) ; servi aujourd’hui « Seul un lieutenant du genre Gros bras peut partir '
     'sur ce coup. Envoyez-en un, ou recrutez-en un. » ; « cet homme ne cogne pas » (f2) est GENRÉ (D13) → liste de l’user ; « Ce lieutenant » est un NOM, '
     'aucune forme accordée à la personne (un pronom « celui-ci » le serait)'],
    refus('404 RESOURCE_NOT_FOUND', f'Ce coup ne tient plus. Reprenez depuis la liste.', 'This job no longer holds. Start again from the list.',
          'UN mot : le 404 couvre lieutenant pas au joueur, clé de rival hors domaine, rival sans état — ni code ni `details` ne les distinguent '
          '(D7) ; servi générique `error.resource.not_found` « Ce n’est plus là. »'),
    refus('422 VALIDATION_FAILED', f'L’ordre n’est pas parti{NB}: il était mal formé. Réessayez.', 'The order didn’t go out: it was malformed. Try again.',
          'UN mot : `details.param` nomme le champ (lieutenant_id, target_holding_id, champ inconnu) mais le joueur ne saisit rien sur ㉙ ; '
          'servi générique `error.validation.failed` parle de « ce que vous avez saisi » — faux ici'),
    refus('échec réseau', f'La ligne a coupé{NB}: on ne sait pas si l’ordre est parti. Réessayez, il ne partira pas deux fois.',
          'The line went dead: we don’t know if the order went out. Try again — it won’t go out twice.',
          'CONDITION : « il ne partira pas deux fois » n’est vrai que si le client réémet la MÊME `Idempotency-Key` (intercepteur global du back) ; '
          'sinon, retirer la seconde phrase'),
    ['La dernière fois chez eux : {issue}, et la ville a chauffé {chaleur}.', CAD, P, 'conflit.bloc.derniere_fois_chez_eux',
     f'La dernière fois chez eux{NB}: {{issue}}, et la ville a chauffé {{chaleur}}.', 'Last time at their place: {issue}, and the city heated up {chaleur}.',
     'clé NOMMÉE (paramètres) ; {issue} ← `conflit.issue_phrase.*`, {chaleur} ← `conflit.chaleur.*` (déjà minuscules, 40) ; une phrase entière '
     'au lieu des fragments `conflit.bloc.fois_chez_eux` + `conflit.bloc.la_ville_a_chauffe` (l’ordre des mots se traduit) ; '
     'issue nulle (coup pas encore rentré) → la phrase ne s’affiche pas'],
]
ISSUE_PHRASE = [('breakthrough', 'une percée', 'a breakthrough'), ('advance', 'du terrain gagné', 'ground gained'),
                ('hold', 'rien obtenu', 'nothing gained'), ('contested', 'ça s’est disputé', 'it was contested'),
                ('retreat', 'on a reculé', 'we fell back')]
for k, fr, en in ISSUE_PHRASE:
    LIGNES.append(['(complément de famille)', CAD, P, f'conflit.issue_phrase.{k}', fr, en,
                   f'forme au milieu de la phrase de `conflit.issue.{k}` (la casse est un mot)'])
LIGNES.append(['{chaleur}', CAD, N, '', '', '', 'réutilise `conflit.chaleur.low/medium/high` (un peu · pas mal · beaucoup) de la 40 — pas de famille neuve ; '
               'mesuré : l’assaut sert aujourd’hui toujours `medium` (`ASSAULT_HEAT_INCREMENT_BUCKET`, combat.service.ts:109, calibration)'])

def main():
    st = subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'], capture_output=True, text=True, check=True).stdout
    def registre(nom):
        d = st.index(f'export const {nom}'); return set(re.findall(r"^\s*'([^'\s]+)':", st[d:st.index('\n};', d)], re.M))
    EN, FR = registre('EN_MESSAGES'), registre('FR_MESSAGES')
    # les `error.*` vivent dans ERROR_TEXT_RATIFIED (en: {…}, fr: {…}), pas dans EN/FR_MESSAGES — chaque locale lue par son nom
    e = st.index('const ERROR_TEXT_RATIFIED'); ef = st.index('\n  fr: {', e); fin = st.index('\n};', e)
    EN |= set(re.findall(r"^\s*'([^'\s]+)':", st[e:ef], re.M)); FR |= set(re.findall(r"^\s*'([^'\s]+)':", st[ef:fin], re.M))
    t40 = open(os.path.join(ICI, '40-conflit-mots-2026-09-23.tsv'), encoding='utf-8').read()
    issues40 = sorted(set(re.findall(r'conflit\.issue\.(\w+)', t40)))
    chaleurs40 = sorted(set(re.findall(r'conflit\.chaleur\.(\w+)', t40)))
    d = []
    for l in LIGNES:
        m, _, cl, k, fr, en, note = l
        if not fr: continue
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17 (espace ordinaire)')
        if re.search(r'[^ ][:]', fr.replace('{', '').replace('}', '')) : d.append(f'{m} : D17 (« : » sans U+00A0)')
        if "'" in fr or "'" in en: d.append(f'{m} : apostrophe droite')
        if sorted(re.findall(r'\{\w+\}', fr)) != sorted(re.findall(r'\{\w+\}', en)): d.append(f'{m} : paramètres fr ≠ en')
        if k.startswith('conflit.refus.') and k != 'conflit.refus.' + slug(fr): d.append(f'{m} : clé non dérivée')
        if k.startswith('error.') and not (k in EN and k in FR): d.append(f'{m} : {k} annoncée servie, absente d’un registre')
    if sorted(k for k, _, _ in ISSUE_PHRASE) != issues40: d.append(f'issue_phrase {sorted(k for k, _, _ in ISSUE_PHRASE)} ≠ issues de la 40 {issues40}')
    if chaleurs40 != ['high', 'low', 'medium']: d.append(f'chaleurs de la 40 {chaleurs40}')
    cles = [l[3] for l in LIGNES if l[3]]
    if len(cles) != len(set(cles)): d.append('clé en double')
    out = os.path.join(ICI, '40-addendum-engagements-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']) + '\n')
        for l in LIGNES: f.write('\t'.join(l) + '\n')
    comp = sum(1 for l in LIGNES if l[0].startswith('('))
    print(f'addendum 40 : somme = {len(LIGNES)} lignes = {len(LIGNES) - comp} mots + {comp} compléments · clés {len(cles)} '
          f'(1 servie à valeur neuve, {len(cles) - 1} proposées) · issues {issues40} · chaleurs {chaleurs40}')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
