#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""44 — ㉜ ce que vous avez confié : les mots sans clé servie de ses cadres série 6 (73-78 ; balayage `34-…`), même format que 37/40/43
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12-D17 ; gestes avec ou sans route. ㉜ « ratifié par délégation » le 02/09.
Données servies (back `8d315a36`, lu) :
  `GET /v1/meta/task-categories` → `task_categories[{category_key ∈ ROUTE_ASSIGNMENT|LIEUTENANT_HIRING|SUPPLY_SOURCING|HEAT_MANAGEMENT, mastery_bucket,
      progress_band, delegation_state ∈ SELF|DELEGATED, recovery, recall_scar}]`, `delegated[]` ;
  `GET /v1/meta/recall-preview/:categoryId` → `{drop_bucket ∈ FAIBLE|MOYEN|ELEVE, recovery_bucket ∈ COURT|MOYEN|LONG, severance_bucket ∈
      LOW|MEDIUM|HIGH|RUINOUS, window_days_band ∈ SHORT|STANDARD|EXTENDED, suspended_successor_key?, re_delegation_penalty}`
      (`promotion-lock.service.ts:106-113`, `severance-bucket.ts:29`) ;
  `POST /v1/meta/graduation` (confier) · `POST /v1/meta/recall` (reprendre) — refus 409 : la charge n'est plus à vous / plus confiée,
      un verrou de promotion ACTIF (`graduation.service.ts:217-245`, `promotion-lock.service.ts:404-413`).
✅ La règle « une seule décision de structure » (cadres 73-77) EST au back (corrigé le 23/09, f2) : `StructuralDecisionGovernorService`
   (`progression/loop10/structural-decision-governor.service.ts:80-97`) enveloppe `POST /v1/meta/graduation` (TASK_RETIREMENT) ET `POST /v1/meta/recall`
   (TASK_RECALL) — UNE décision structurelle par SESSION (active), 409 `STRUCTURAL_CAP_EXHAUSTED`, `retry_scope: next_session`. Le message servi
   (`error.core_loops.structural_cap_exhausted`) dit « Vous avez utilisé votre décision de structure du jour. Reprenez demain. » ⚠️ Tension : l'unité
   est la SESSION, la maquette ratifiée et le servi disent le JOUR (le funnel du canon nomme ses sessions D1…D7, « jours ») — à f2.
Clés : `delegation.bloc.<slug>` (le client : `Libelle.De("delegation", "bloc", …)`) ; familles neuves `delegation.charge.*`, `delegation.chute.*`,
`delegation.regain.*`, `delegation.indemnite.*`, `delegation.fenetre.*`, `delegation.refus.*`.
⚠️ D14 — mots GENRÉS de la maquette ratifiée, non corrigés, à la liste de l'user : `GENRES`.
Sortie : `44-delegation-mots-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-44-delegation-mots.py"""
import collections, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__)); NB = ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
def q(t): return f'«{NB}{t}{NB}»'
S, A, P, N = 'servie', 'servie · D14', 'proposée', 'note'
JOUR = ('refus RÉEL : le gouverneur « une décision structurelle par session » (409 STRUCTURAL_CAP_EXHAUSTED) couvre confier ET reprendre ; '
        '⚠️ D14 en tension : la maquette dit « jour », l’unité du back est la session (le servi dit aussi « du jour ») — à f2')
HUIT = 'panneau des charges non vivantes (78) : ce que le jeu prévoit et que rien ne sert — pas un libellé (les 4 charges servies sont celles de `task-categories`)'
def b(fr, en, note=''): return (P, 'delegation.bloc.' + slug(re.sub(r'\{(\w+)\}', r'\1', re.sub(r'[«» ]', '', fr))), fr, en, note)
T = {
 'Ce que vous tenez encore vous-même': b('Ce que vous tenez encore vous-même', 'What you still handle yourself', 'titre, toutes les charges `SELF`'),
 'Quatre choses. Chacune peut être confiée — et reprise, à un prix.': b('Quatre choses. Chacune peut être confiée — et reprise, à un prix.',
   'Four things. Each can be handed over — and taken back, at a price.', '« Quatre » = les 4 charges VIVANTES servies (constante du catalogue, pas un compte)'),
 'Une décision de structure aujourd’hui': b('Une décision de structure aujourd’hui', 'One structural decision today', JOUR),
 'confier ou reprendre — pas les deux': b('confier ou reprendre — pas les deux', 'hand over or take back — not both', JOUR),
 'Les tournées': (P, 'delegation.charge.route_assignment', 'Les tournées', 'Deliveries', '`category_key` = ROUTE_ASSIGNMENT'),
 'qui livre quoi, et par où': b('qui livre quoi, et par où', 'who delivers what, and which way', 'le sens de ROUTE_ASSIGNMENT'),
 'vous': b('vous', 'you', '`delegation_state` = SELF : qui tient la charge'),
 'vous la faites': b('vous la faites', 'you do it', '`delegation_state` = SELF'),
 'L’embauche': (P, 'delegation.charge.lieutenant_hiring', 'L’embauche', 'Hiring', '= LIEUTENANT_HIRING'),
 'qui entre dans la maison': b('qui entre dans la maison', 'who joins the house', ''),
 'L’approvisionnement': (P, 'delegation.charge.supply_sourcing', 'L’approvisionnement', 'Supply', '= SUPPLY_SOURCING ; même mot que `famille.category.approvisionnement` proposé en 37'),
 'ce qu’on commande, et à qui': b('ce qu’on commande, et à qui', 'what we order, and from whom', ''),
 'ce qu’on fait quand la ville s’échauffe': b('ce qu’on fait quand la ville s’échauffe', 'what we do when the city heats up', 'le sens de HEAT_MANAGEMENT (titre « La chaleur », servi)'),
 'Tant que vous tenez tout,': b('Tant que vous tenez tout, rien ne se fait sans vous — et rien ne se fait pendant que vous dormez.',
   'As long as you hold everything, nothing happens without you — and nothing happens while you sleep.', 'une phrase en trois nœuds : une clé'),
 'rien ne se fait sans vous': (P, 'delegation.bloc.tant_que_vous_tenez_tout_rien_ne_se_fait_sans_vous_et_rien_ne_se_fait_pendant_que_vous_dormez', '', '', 'même phrase'),
 '— et rien ne se fait pendant que vous dormez.': (P, 'delegation.bloc.tant_que_vous_tenez_tout_rien_ne_se_fait_sans_vous_et_rien_ne_se_fait_pendant_que_vous_dormez', '', '', 'même phrase'),
 'EN CONFIER UNE': b('En confier une', 'Hand one over', 'geste À ROUTE (`POST /v1/meta/graduation`)'),
 'vous ne la ferez plus vous-même': b('vous ne la ferez plus vous-même', 'you won’t do it yourself any more', ''),
 'Confier une de vos charges': b('Confier une de vos charges', 'Hand over one of your jobs', 'titre (74)'),
 'Vous ne la ferez plus. Quelqu’un d’autre la fera, à sa façon.': b('Vous ne la ferez plus. Quelqu’un d’autre la fera, à sa façon.',
   'You won’t do it any more. Someone else will, their way.', '« quelqu’un » : indéfini, aucun genre présumé'),
 '« Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes. »':
   b(q('Donnez-moi {charge}. Je m’en occupe, et vous ne verrez plus passer les commandes.'),
     '“Give me {charge}. I’ll handle it, and you won’t see the orders go by any more.”',
     'réplique du lieutenant (74) ; « l’approvisionnement » → `{charge}` ; ⚠️ « les commandes » ne vaut que pour SUPPLY_SOURCING'),
 'LA LUI CONFIER': b('La lui confier', 'Hand it to them', 'geste À ROUTE (`POST /v1/meta/graduation`)'),
 'c’est votre décision du jour': b('c’est votre décision du jour', 'it’s your decision for the day', JOUR),
 'Ce que vous avez confié': b('Ce que vous avez confié', 'What you’ve handed over', 'titre (75), les charges `DELEGATED`'),
 '2 charges tenues par quelqu’un d’autre. Vous pouvez les reprendre, à un prix.': (P, 'delegation.bloc.n_charges_tenues_par_quelqu_un_d_autre',
   '{n, plural, one {# charge tenue} other {# charges tenues}} par quelqu’un d’autre. Vous pouvez les reprendre, à un prix.',
   '{n, plural, one {# job held} other {# jobs held}} by someone else. You can take them back, at a price.',
   'D15 : le nombre vient de `delegated[]` → ICU ; clé NOMMÉE (un message ICU ne se dérive pas par slug, comme en 37, 40, 43)'),
 'depuis 6 jours': (N, '', '', '', 'aucun champ servi ne dit DEPUIS QUAND une charge est confiée (`task-categories` : pas de date ; `delegated[]` vide au corps réel) — exemple (point 19) ; passé à côté ?'),
 'Reprendre l’approvisionnement': b('Reprendre {charge}', 'Take back {charge}', 'titre (76) ; `{charge}` = `delegation.charge.*`'),
 'Voilà ce que ça coûterait. On vous le dit avant, pas après.': b('Voilà ce que ça coûterait. On vous le dit avant, pas après.', 'Here’s what it would cost. We tell you before, not after.', 'l’aperçu `recall-preview` (consultatif)'),
 'Ce qu’il a appris': b('Ce qu’il a appris', 'What they learned', 'ligne `drop_bucket` ; ⚠️ D14 : « il » genré'),
 'retombe brutalement': (P, 'delegation.chute.eleve', 'retombe brutalement', 'drops sharply', '`drop_bucket` = ELEVE (ratifié) ; §compléments'),
 'Pour tout regagner': b('Pour tout regagner', 'To win it all back', 'ligne `recovery_bucket`'),
 'très longtemps': (P, 'delegation.regain.long', 'très longtemps', 'a very long time', '`recovery_bucket` = LONG (ratifié)'),
 'Ce qu’on lui doit': b('Ce qu’on lui doit', 'What we owe them', 'ligne `severance_bucket` ; ⚠️ D14 : « lui » genré'),
 'ruineux': (P, 'delegation.indemnite.ruinous', 'ruineux', 'ruinous', '`severance_bucket` = RUINOUS (ratifié) ; s’accorde à « ce qu’on doit »'),
 'pendant long': (P, 'delegation.fenetre.extended', 'pendant long', 'for a long while', '`window_days_band` = EXTENDED (ratifié) ; suit « Il vous en veut » (servi, `reputation.etat.il_vous_en_veut`)'),
 'Celui qu’il formait': b('Celui qu’il formait', 'The one they were training', 'ligne `suspended_successor_key` ; ⚠️ D14 : « Celui », « il » genrés'),
 's’arrête aussi': b('s’arrête aussi', 'stops too', '`suspended_successor_key` présent'),
 'Si vous reconfiez plus tard': b('Si vous reconfiez plus tard', 'If you hand it over again later', 'ligne `re_delegation_penalty`'),
 'ça coûtera plus': b('ça coûtera plus', 'it will cost more', '`re_delegation_penalty` = vrai'),
 'Ceci est un avertissement, pas un mur : le jeu vous laissera le faire.': b(f'Ceci est un avertissement, pas un mur{NB}: le jeu vous laissera le faire.',
   'This is a warning, not a wall: the game will let you do it.', 'D17 : insécable avant « : »'),
 '« Vous pouvez la reprendre. Il ne le prendra pas bien, et ce qu’il savait faire, vous devrez le réapprendre. »':
   b(q('Vous pouvez la reprendre. Il ne le prendra pas bien, et ce qu’il savait faire, vous devrez le réapprendre.'),
     '“You can take it back. They won’t take it well, and what they knew how to do, you’ll have to learn again.”', 'réplique d’un autre lieutenant (76) ; ⚠️ D14 : « Il », « il » genrés'),
 'LA REPRENDRE QUAND MÊME': b('La reprendre quand même', 'Take it back anyway', 'geste À ROUTE (`POST /v1/meta/recall`)'),
 'Vous avez déjà tranché aujourd’hui': b('Vous avez déjà tranché aujourd’hui', 'You’ve already decided today', JOUR + ' ; le titre du refus (le servi générique : `error.core_loops.structural_cap_exhausted`)'),
 'On ne redessine pas la maison deux fois dans la même journée.': b('On ne redessine pas la maison deux fois dans la même journée.', 'You don’t redraw the house twice in one day.', JOUR),
 'Décision déjà prise aujourd’hui': b('Décision déjà prise aujourd’hui', 'Decision already made today', JOUR),
 'la prochaine sera pour demain': b('la prochaine sera pour demain', 'the next one will be tomorrow', JOUR + ' (`retry_scope: next_session`)'),
 'Vous avez déjà confié': b('Vous avez déjà confié {charge} aujourd’hui.', 'You already handed over {charge} today.', JOUR + ' ; une phrase en trois nœuds ; « ce matin » : aucune donnée ne dit le moment (point 19) → « aujourd’hui »'),
 'l’embauche': (P, 'delegation.bloc.vous_avez_deja_confie_charge_aujourd_hui', '', '', 'même phrase (`{charge}`)'),
 'ce matin.': (P, 'delegation.bloc.vous_avez_deja_confie_charge_aujourd_hui', '', '', 'même phrase ; « ce matin » → « aujourd’hui »'),
 'plus de décision aujourd’hui': b('plus de décision aujourd’hui', 'no more decisions today', JOUR),
 'Une seule décision de structure par journée': b('Une seule décision de structure par journée, confier et reprendre comprises. Ce n’est pas une limite d’énergie : c’est pour qu’une maison ne se redessine pas entièrement en un après-midi.'.replace(' :', '\u00a0:'),
   'One structural decision per day, handing over and taking back included. It isn’t an energy limit: it’s so a house isn’t redrawn in a single afternoon.', JOUR + ' ; une phrase en deux nœuds ; D17'),
 ', confier et reprendre comprises. Ce n’est pas une limite d’énergie : c’est pour qu’une maison ne se redessine pas entièrement en un après-midi.': (P, 'delegation.bloc.une_seule_decision_de_structure_par_journee_confier_et_reprendre_comprises_ce_n_est_pas_une_limite_d_energie_c_est_pour_qu_une_maison_ne_se_redessine_pas_entierement_en_un_apres_midi', '', '', 'même phrase'),
 'Ce qui n’est pas encore à confier': (N, '', '', '', HUIT), 'Huit autres charges existent dans le jeu. Personne ne les tient encore.': (N, '', '', '', HUIT),
 'Existent, mais personne n’y touche': (N, '', '', '', HUIT), 'Le Lek': (N, '', '', '', HUIT), 'les contestations de coin': (N, '', '', '', HUIT),
 'Le blanchiment': (N, '', '', '', HUIT), 'faire rentrer l’argent': (N, '', '', '', HUIT), 'Le réoutillage': (N, '', '', '', HUIT),
 'changer ce que produit un site': (N, '', '', '', HUIT), 'La topologie du réseau': (N, '', '', '', HUIT), 'redessiner les routes': (N, '', '', '', HUIT),
 'L’architecture de délégation': (N, '', '', '', HUIT), 'déléguer la délégation elle-même': (N, '', '', '', HUIT), 'Le dessin du réseau Lek': (N, '', '', '', HUIT),
 'où poser les coins': (N, '', '', '', HUIT), 'Huit charges existent dans le jeu et': (N, '', '', '', HUIT), 'personne n’y touche encore': (N, '', '', '', HUIT),
 'Elles existent, mais': (N, '', '', '', HUIT), 'il n’y a rien derrière': (N, '', '', '', HUIT + ' (« rien derrière » est servi : `delegation.bloc.rien_derriere`)'),
 '— ni pour les confier, ni même pour les voir bouger. Tant que c’est le cas, la délégation ne porte que sur': (N, '', '', '', HUIT),
 'choses.': (N, '', '', '', HUIT),
}
COMPLEMENTS = [
 ('delegation.charge.heat_management', 'La chaleur', 'Heat', 'le titre de HEAT_MANAGEMENT (ratifié 73)'),
 ('delegation.chute.faible', 'baisse un peu', 'dips a little', 'PROPOSÉ'), ('delegation.chute.moyen', 'baisse nettement', 'drops clearly', 'PROPOSÉ'),
 ('delegation.regain.court', 'peu de temps', 'a short while', 'PROPOSÉ'), ('delegation.regain.moyen', 'un bon moment', 'a good while', 'PROPOSÉ'),
 ('delegation.indemnite.low', 'peu', 'little', 'PROPOSÉ'), ('delegation.indemnite.medium', 'une somme', 'a sum', 'PROPOSÉ'),
 ('delegation.indemnite.high', 'cher', 'a lot', 'PROPOSÉ'),
 ('delegation.fenetre.short', 'pendant peu', 'for a short while', 'PROPOSÉ (même tournure que le ratifié « pendant long »)'),
 ('delegation.fenetre.standard', 'pendant un temps', 'for a while', 'PROPOSÉ'),
 ('delegation.refus.la_charge_n_est_plus_a_vous', 'la charge n’est plus à vous', 'this job is no longer yours', '409 graduation : « is not SELF-managed »'),
 ('delegation.refus.la_charge_n_est_plus_confiee', 'la charge n’est plus confiée', 'this job is no longer handed over', '409 recall : « is not DELEGATED »'),
 ('delegation.refus.un_changement_est_deja_en_cours_sur_cette_charge', 'un changement est déjà en cours sur cette charge', 'a change is already under way on this job',
  '409 « ACTIVE promotion lock » (confier OU reprendre), PAR CHARGE — distinct du gouverneur par session (cadre 77)'),
]
GENRES = ['« Ce qu’il a appris » (76)', '« Ce qu’on lui doit » (76)', '« Celui qu’il formait » (76)', '« Il ne le prendra pas bien, et ce qu’il savait faire » (76, réplique)']

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㉜' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d, out, comptes = [], ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    if set(mots) != set(T): d.append(f'non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and fr and cle in FRV and FRV[cle] != fr: d.append(f'{m} : {cle} déjà servie autrement')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMPLEMENTS:
        if cle in FRV: d.append(f'{cle} : complément déjà servi')
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, '44-delegation-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㉜ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    print('mots genrés ratifiés → liste de l’user (D14) :'); [print('   ', g) for g in GENRES]
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
