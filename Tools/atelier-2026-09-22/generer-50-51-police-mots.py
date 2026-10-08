#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""50 et 51 — ⑮ les inspections et ⑰ le commissariat : les 64 mots sans clé servie de leurs cadres PARTAGÉS (série 6 31-35 ; balayage `34-…`,
écran « ⑮·⑰ »), répartis par la ROUTE qui les sert (commande f2 du 23/09 ; même format que 37-49).
  ⑮ (`InspectionScreenController`) : `GET /v1/city/district/:id/inspection` → `{queue_load ∈ EMPTY|LIGHT|MODERATE|HEAVY|SATURATED, dispatcher_regime ∈
      NOMINAL|BACKLOGGED|BUDGET_CUT|SURGE, severity_distribution, type_distribution{SCHEDULED, INFORMANT, FALSE_REPORT, GENUINE_REPORT, CASCADE, FORENSIC}
      ∈ PresenceBand NONE|SOME|MANY|PREDOMINANT}` ; `POST /v1/city/inspection/report {building_id, entry_type ∈ FALSE_REPORT|GENUINE_REPORT}` →
      `{report_id, entry_type, cost_resolved, backlash_triggered}` (`inspection.controller.ts:76-129`) — cadres 32 (le registre), 33 (le coup fourré),
      34 (le retour de bâton, sauf ses mots de précinct).
  ⑰ (`PrecinctScreenController`, `Libelle.De("police", "bloc", …)`) : `GET /v1/city/precinct/:id/belief`, `…/patrol` (mots servis : `police.bloc.*`,
      30 v2 / D14) — cadres 31 (ce qu'ils savent), 35 (leurs descentes) et les mots de précinct du 34.
D11 : les barres ▓ du registre (32) codaient `PresenceBand` → des MOTS (famille `inspection.presence.*`). D17, D15 (aucun nombre non servi).
Clés : ⑮ `inspection.<rôle>.<slug>` (domaine neuf : le contrôleur ⑮ n'a encore aucun `Libelle`) ; ⑰ `police.bloc.<slug>`.
Sorties : `50-inspections-mots-2026-09-23.tsv`, `51-commissariat-mots-2026-09-23.tsv` (+ `somme-table.py`).
Usage : python3 Tools/atelier-2026-09-22/generer-50-51-police-mots.py"""
import collections, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
S, A, P, N = 'servie', 'servie · D14', 'proposée', 'note'
def i(fr, en, note='', role='bloc'): return (P, f'inspection.{role}.' + slug(fr), fr, en, note)
def p(fr, en, note=''): return (P, 'police.bloc.' + slug(re.sub(r'\{(\w+)\}', r'\1', fr)), fr, en, note)
GLYPHE = 'les barres ▓ codaient `PresenceBand` : D11 — le MOT de la bande (`inspection.presence.*`) et le type (`inspection.origine.*`) les remplacent'
DA = 'explication de DA dans le téléphone — pas un libellé'
HIST = 'historique / rattachement NON servi (35 : « Avec les lots : les districts sous chaque commissariat, l’historique des descentes… ») — exemple'
T50 = {  # ⑮
 'BPD · REGISTRE DE DISPATCH': i('Registre de dispatch', 'Dispatch log', 'titre du registre (32) ; « BPD » : sigle de fiction retiré (pas une donnée)'),
 'DISTRICT': i('district', 'district', 'colonne'), 'N': (N, '', '', '', 'colonne d’un nombre de dossiers : `total_queue_length` n’est pas servi au joueur (R2.2) — ne pas l’afficher'),
 'CHARGE': i('charge', 'load', 'colonne `queue_load`'), 'REGIME': i('régime', 'regime', 'colonne `dispatcher_regime` (l’accent manquait à la maquette)'),
 'ORIGINES': i('origines', 'sources', 'colonne `type_distribution`'),
 'LEGERE': (P, 'inspection.charge.light', 'légère', 'light', '`queue_load` = LIGHT (ratifié, accent rétabli) ; §compléments'),
 'NOMINAL': (P, 'inspection.regime.nominal', 'nominal', 'nominal', '`dispatcher_regime` = NOMINAL (ratifié)'),
 'PROGRAMMEE ▓▓▓ INDIC ▓': (P, 'inspection.origine.scheduled + inspection.presence.predominant + inspection.origine.informant + inspection.presence.some',
   'programmée · surtout · indic · un peu', 'scheduled · mostly · informant · a little', GLYPHE),
 'PROGRAMMEE ▓': (P, 'inspection.origine.scheduled + inspection.presence.some', '', '', GLYPHE),
 'ARRIERE': (P, 'inspection.regime.backlogged', 'arriéré', 'backlogged', '= BACKLOGGED (ratifié, accents rétablis)'),
 'PROGRAMMEE ▓▓ FORENSIQUE ▓▓': (P, 'inspection.origine.scheduled + inspection.presence.many + inspection.origine.forensic + inspection.presence.many', '', '', GLYPHE),
 'CASCADE ▓': (P, 'inspection.origine.cascade + inspection.presence.some', '', '', GLYPHE),
 'PROGRAMMEE ▓▓': (P, 'inspection.origine.scheduled + inspection.presence.many', '', '', GLYPHE),
 'INDIC ▓': (P, 'inspection.origine.informant + inspection.presence.some', '', '', GLYPHE),
 'PROGRAMMEE ▓▓ FORENSIQUE ▓': (P, 'inspection.origine.scheduled + inspection.presence.many + inspection.origine.forensic + inspection.presence.some', '', '', GLYPHE),
 '18 DISTRICTS · TOUT OU RIEN : LA POLICE OUVRE SES FILES PARTOUT À LA FOIS': (N, '', '', '', DA),
 'LE COUP FOURRÉ': i('Le coup fourré', 'The dirty trick', 'titre (33) : le faux signalement'),
 'on leur donne un os à ronger': i('on leur donne un os à ronger', 'we throw them a bone', ''),
 'DÉPOSER UN SIGNALEMENT': i('Déposer un signalement', 'File a report', 'geste À ROUTE (`POST /v1/city/inspection/report`)'),
 'SUR': i('sur un bâtiment de {quartier}', 'on a building in {quartier}', 'une phrase en deux nœuds ; `building_id`'),
 'un bâtiment de La Lisière': (P, 'inspection.bloc.sur_un_batiment_de_quartier', '', '', 'même phrase (« La Lisière » → `{quartier}`)'),
 'PRIX': i('prix', 'cost', 'la ligne de `cost_resolved` (rendu par la route, une bande)'),
 'annoncé par le serveur — rien n’est débité aujourd’hui': (N, '', '', '', DA + ' (« le serveur »)'),
 'EFFET': i('effet', 'effect', ''), 'une entrée de plus dans leur file': i('une entrée de plus dans leur file', 'one more entry in their queue', ''),
 'DÉPOSER': i('Déposer', 'File', 'la confirmation du geste (même route)'),
 '⚠ au bout de plusieurs, la police se retourne': i('au bout de plusieurs, la police se retourne', 'after several, the police turn around', 'D11 : le glyphe ⚠ retiré, le mot suffit'),
 'LE RETOUR DE BÂTON': i('Le retour de bâton', 'The backlash', 'titre (34) : `backlash_triggered` = vrai'),
 'ils ont compris': i('ils ont compris que les signalements venaient de vous', 'they worked out the reports came from you', 'une phrase en deux nœuds'),
 'ils ont compris que les signalements venaient de vous': (P, 'inspection.bloc.ils_ont_compris_que_les_signalements_venaient_de_vous', '', '', 'même phrase'),
 'RETOURNÉE': i('retournée', 'turned', 'la marque de la police après le retour de bâton ; s’accorde à « la police »'),
 'Le huitième signalement a fait basculer la police.': (N, '', '', '', 'D15 : le seuil est un RAPPORT faux:vrais sur 30 jours (8:1, `inspection.controller.ts:110-111`), pas le « huitième » dépôt — la maquette présume un compte'),
 'Elle vous rend la monnaie': i('Elle vous rend la monnaie', 'They pay you back', '« Elle » = la police'),
 '— huit fois.': (N, '', '', '', 'D15 : aucun compte servi'),
 'représailles restantes ·': (N, '', '', '', 'D15 : aucun compte de représailles servi'), 'dépôts dans la fenêtre': (N, '', '', '', 'D15 : aucun compte servi'),
}
T51 = {  # ⑰
 'CE QU’ILS SAVENT': p('Ce qu’ils savent', 'What they know', 'titre (31) : `belief` de chaque précinct'),
 'six commissariats · relevé de nos guetteurs': p('six commissariats · relevé de nos guetteurs', 'six precincts · from our lookouts', '« six » : constante de la ville'),
 'PRÉCINCT 1': p('Précinct {n}', 'Precinct {n}', 'le nom d’un précinct ; D15 : `{n}` est l’identifiant servi'),
 'PRÉCINCT 2': (P, 'police.bloc.precinct_n', '', '', 'même clé'), 'PRÉCINCT 3': (P, 'police.bloc.precinct_n', '', '', 'même clé'),
 'PRÉCINCT 4': (P, 'police.bloc.precinct_n', '', '', 'même clé'), 'PRÉCINCT 5': (P, 'police.bloc.precinct_n', '', '', 'même clé'),
 'PRÉCINCT 6': (P, 'police.bloc.precinct_n', '', '', 'même clé'),
 'Les Bassins·2·3': (N, '', '', '', HIST), 'La Colonne·B·C': (N, '', '', '', HIST), 'Saint-Brand · Les Entrepôts·2': (N, '', '', '', HIST),
 'Le Treillis·B·C': (N, '', '', '', HIST), 'Le Verre·2·3': (N, '', '', '', HIST), 'La Lisière·B·C': (N, '', '', '', HIST),
 'patrouilles': p('patrouilles', 'patrols', 'la ligne de `patrol` (valeurs servies `police.bloc.partout`…)'),
 'descente il y a 3 jours — bloc 47': (N, '', '', '', HIST),
 'vos quatre bâtiments sont ici': (P, 'police.bloc.vos_n_batiments_sont_ici', '{n, plural, one {votre bâtiment est ici} other {vos # bâtiments sont ici}}',
   '{n, plural, one {your building is here} other {your # buildings are here}}', 'D15 : le compte vient de l’intérieur servi ; clé NOMMÉE (ICU)'),
 'Quatre d’entre eux vous chassent —': (P, 'police.bloc.n_d_entre_eux_vous_chassent', '{n, plural, one {Un d’entre eux vous chasse} other {# d’entre eux vous chassent}} —',
   '{n, plural, one {One of them is hunting you} other {# of them are hunting you}} —', 'le compte des `belief` = HUNTING ; clé NOMMÉE (ICU)'),
 'aucun ne dort': p('aucun ne dort', 'none is asleep', 'le compte des DORMANT = 0'),
 'LEURS DESCENTES': p('Leurs descentes', 'Their raids', 'titre (35)'),
 'ce que le back sait déjà et ne dit pas': (N, '', '', '', DA + ' (« le back »)'),
 'Les Quais 1·2·3': (N, '', '', '', HIST), 'Le La Lisière·B·C': (N, '', '', '', HIST + ' ; ⚠️ coquille de maquette « Le La Lisière »'),
 'DESCENTE · il y a 3 jours · bloc 47 · aucun blessé': (N, '', '', '', HIST), 'DESCENTE · hier · votre entrepôt ·': (N, '', '', '', HIST),
 'à réparer': (N, '', '', '', HIST + ' (l’état du bâtiment est servi ailleurs : `building.structural.*`)'),
 'Avec les lots : les districts sous chaque commissariat, l’historique des descentes, et l’état de représailles qui reste affiché tant qu’il dure.': (N, '', '', '', DA),
}
COMP50 = [
 ('inspection.charge.empty', 'vide', 'empty', 'PROPOSÉ'), ('inspection.charge.moderate', 'moyenne', 'moderate', 'PROPOSÉ'),
 ('inspection.charge.heavy', 'lourde', 'heavy', 'PROPOSÉ'), ('inspection.charge.saturated', 'saturée', 'saturated', 'PROPOSÉ'),
 ('inspection.regime.budget_cut', 'budget coupé', 'budget cut', 'PROPOSÉ'), ('inspection.regime.surge', 'en renfort', 'surging', 'PROPOSÉ'),
 ('inspection.origine.scheduled', 'programmée', 'scheduled', 'ratifié (32)'), ('inspection.origine.informant', 'indic', 'informant', 'ratifié (32)'),
 ('inspection.origine.cascade', 'cascade', 'cascade', 'ratifié (32)'), ('inspection.origine.forensic', 'forensique', 'forensic', 'ratifié (32)'),
 ('inspection.origine.false_report', 'faux signalement', 'false report', 'PROPOSÉ'), ('inspection.origine.genuine_report', 'signalement', 'report', 'PROPOSÉ'),
 ('inspection.presence.none', 'aucune', 'none', 'PROPOSÉ (D11 : la bande en mot)'), ('inspection.presence.some', 'un peu', 'a little', 'PROPOSÉ (▓)'),
 ('inspection.presence.many', 'beaucoup', 'a lot', 'PROPOSÉ (▓▓)'), ('inspection.presence.predominant', 'surtout', 'mostly', 'PROPOSÉ (▓▓▓)'),
]

def ecrire(nom, T, COMP, sym, mots, FRV, d):
    out, comptes = ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    for m, cadres in mots.items():
        if m not in T: continue
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl == P and fr and '+' not in cle and cle in FRV and FRV[cle] != fr: d.append(f'{sym} {m} : {cle} servie avec d’autres mots')
        if "'" in fr + en: d.append(f'{sym} {m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{sym} {m} : D17')
        if re.search(r'[▓⚠]', fr): d.append(f'{sym} {m} : glyphe (D11)')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMP:
        if cle in FRV and FRV[cle] != fr: d.append(f'{cle} : complément servi avec d’autres mots')
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, nom), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{sym} : {len(out) - 1 - len(COMP)} mots · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMP)} compléments → {nom}')

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '⑮·⑰' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d = []
    if set(T50) & set(T51): d.append(f'un mot dans les deux tables : {sorted(set(T50) & set(T51))}')
    if set(mots) != set(T50) | set(T51): d.append(f'non couverts : {sorted(set(mots) - set(T50) - set(T51))} · en trop : {sorted(set(T50) | set(T51) - set(mots))}')
    ecrire('50-inspections-mots-2026-09-23.tsv', T50, COMP50, '⑮', mots, FRV, d)
    ecrire('51-commissariat-mots-2026-09-23.tsv', T51, [], '⑰', mots, FRV, d)
    print(f'répartition : {len(mots)} mots = {len(T50)} (⑮) + {len(T51)} (⑰)')
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
