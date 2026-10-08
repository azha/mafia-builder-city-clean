#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""46 — ㉞ les ordres du soir (le carnet) : les mots sans clé servie de ses cadres série 6 (85-91 ; balayage `34-…`), même format que 37/40/43/44
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12-D18 ; gestes avec ou sans route. ㉞ ratifié par délégation (02/09).
Données servies (back `8304116d`, lu) :
  `GET /v1/cue-stack/current` → `slots[{slot_type, target_ref{kind,id}, dependencies, drag_order, status, outcome, estimated_time_bucket ∈
      VERY_QUICK|QUICK|MODERATE|LONG|VERY_LONG, prerequisite_satisfaction_bucket ∈ SATISFIED|PENDING|UNSATISFIED, dependency_conflict_bucket ∈
      NONE|WARN|BLOCKING}]` ; `POST cue-stack/compose|reorder|commit {acknowledge_compounding}` (`cue-stack.controller.ts:56-118`) ;
  `slot_type` : 4 VIVANTS (DISTRIBUTION_RUN · MAINTENANCE_BATCH · RECRUITMENT_STEP · EXCEPTION_BATCH_RESOLUTION) + 3 RÉSERVÉS refusés 422
      (`slot-type.catalogue.ts:16-33`) ; `GET /v1/cue-stack/named-sequences` → 403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` (palier 2) ;
  `GET /v1/ambient/feed`, `GET /v1/random-world/active` (descripteurs servis `ambient.micro_event.*`, `random_world.template.*`) ;
      `POST /v1/random-world/hollow/:eventId/attend-funeral`, `POST /v1/ambient/attend/:id`.
  Refus servis `error.cue_stack.*` (dependency_cycle, settling_compound_required…) : ⚠️ ils appellent un ordre du carnet « repère » — le mot
  de ⑦ pour un indice (`famille.repere.*`) : deux choses, un mot (D12). La maquette ratifiée dit « ordre » : D14 → valeurs à aligner (compléments).
⚠️ Les ordres de la maquette « Lancer une cuisson », « Commander du pyralin », « Passer voir Lt. Hara » ne sont PAS des `slot_type` vivants :
   dette de maquette (point 19). Le calendrier « Ce qui arrive » (91) n'a aucune route joueur (le servi le dit déjà).
Clés : `carnet.bloc.<slug>` (le client : `Libelle.De("carnet", "bloc", …)`) ; famille neuve `carnet.ordre.*` (les 4 `slot_type` vivants).
Sortie : `46-carnet-mots-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-46-carnet-mots.py"""
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
def b(fr, en, note=''): return (P, 'carnet.bloc.' + slug(re.sub(r'\{(\w+)\}', r'\1', re.sub(r'[«» ]', '', fr))), fr, en, note)
def nb(cle, fr, en, note=''): return (P, 'carnet.bloc.' + cle, fr, en, note + ' ; clé NOMMÉE (message à paramètres)')
PASTYPE = 'DETTE DE MAQUETTE (point 19) : pas un `slot_type` vivant (4 : tournée · entretien · recrutement · ardoise ; `slot-type.catalogue.ts:16-21`)'
CIBLE = 'nom d’EXEMPLE : la cible d’un ordre est `target_ref` → son nom servi (enseigne `game.fiction.building.name`, quartier) — cf. `carnet.bloc.a_batiment_quartier`'
SEQ = 'soirée mise de côté : la liste rend 403 `NAMED_SEQUENCE_UNLOCK_REQUIRED` au palier 1 — nom / contenu d’EXEMPLE'
VILLE = 'événement d’EXEMPLE : le texte vient du descripteur servi (`ambient.micro_event.*`, `random_world.template.*`) — pas un libellé'
CAL = 'le calendrier (91) n’a AUCUNE route joueur ; le servi le dit : `carnet.bloc.ce_que_la_ville_prepare_personne_ne_vous_le_rapporte_encore_…` — note / dette'
T = {
 '5 ordres sur 8': (S, 'carnet.bloc.ordres_sur_8', '{n} ORDRES SUR 8', '{n} ORDERS OUT OF 8', 'composé : le compte de `slots[]` + la clé servie'),
 'Lancer une cuisson': (N, '', '', '', PASTYPE), 'Commander du pyralin': (N, '', '', '', PASTYPE), 'Passer voir Lt. Hara': (N, '', '', '', PASTYPE),
 'la tournée du soir': (N, '', '', '', PASTYPE + ' (sous-titre)'),
 'à Atelier Vesk (Hautes-Marches)': nb('a_batiment_quartier', 'à {batiment} ({quartier})', 'at {batiment} ({quartier})', 'la cible `target_ref` d’un ordre'),
 'Envoyer un coursier': (P, 'carnet.ordre.distribution_run', 'Envoyer un coursier', 'Send a courier', '`slot_type` = DISTRIBUTION_RUN (ratifié)'),
 'vers Clés-Minute Rook (Le Treillis)': nb('vers_batiment_quartier', 'vers {batiment} ({quartier})', 'to {batiment} ({quartier})', 'la destination d’une tournée'),
 'Régler l’ardoise': (P, 'carnet.ordre.exception_batch_resolution', 'Régler l’ardoise', 'Settle the slate', '= EXCEPTION_BATCH_RESOLUTION (ratifié ; « l’ardoise » = la file des exceptions, ⑨)'),
 'du bar de Verge': (N, '', '', '', CIBLE),
 '« Cinq ordres. On peut en mettre trois de plus, ou partir comme ça. »': nb('n_ordres_on_peut_en_mettre_reste_de_plus_ou_partir_comme_ca',
   q('{n, plural, one {Un ordre} other {# ordres}}. On peut en mettre {reste} de plus, ou partir comme ça.'),
   '“{n, plural, one {One order} other {# orders}}. We can add {reste} more, or go as is.”', 'D15 : les nombres viennent de `slots[]` (max 8)'),
 'LANCER LA SOIRÉE': b('Lancer la soirée', 'Start the evening', 'geste À ROUTE (`POST /v1/cue-stack/commit`)'),
 'une fois partie, on ne la reprend pas': b('une fois partie, on ne la reprend pas', 'once it’s gone, there’s no taking it back', 'aucune route d’annulation après le commit'),
 'Deux ordres s’attendent l’un l’autre': b('Deux ordres s’attendent l’un l’autre', 'Two orders are waiting on each other', '`dependency_conflict_bucket` = BLOCKING (86)'),
 'Aucun des deux ne peut partir en premier.': b('Aucun des deux ne peut partir en premier.', 'Neither can go first.', ''),
 'Le 2 attend le 4, et le 4 attend le 2.': nb('l_ordre_a_attend_le_b_et_le_b_attend_le_a', 'Le {a} attend le {b}, et le {b} attend le {a}.',
   '{a} waits for {b}, and {b} waits for {a}.', 'D15 : les numéros sont les `drag_order` servis'),
 'Il faut en détacher un des deux, sinon la soirée ne démarre pas.': b('Il faut en détacher un des deux, sinon la soirée ne démarre pas.', 'You have to unhook one of them, or the evening won’t start.', ''),
 '« Ça ne peut pas marcher. Chacun attend l’autre. »': b(q('Ça ne peut pas marcher. Chacun attend l’autre.'), '“It can’t work. Each one’s waiting on the other.”', ''),
 'deux ordres se bloquent': b('deux ordres se bloquent', 'two orders block each other', ''),
 'Un endroit n’a pas fini de se poser': b('Un endroit n’a pas fini de se poser', 'A place hasn’t settled yet', '`settling_compound_required` (87)'),
 'Ce qu’on y a changé n’a pas encore pris.': b('Ce qu’on y a changé n’a pas encore pris.', 'What we changed there hasn’t taken yet.', ''),
 '4 ordres sur 8': (S, 'carnet.bloc.ordres_sur_8', '', '', 'même clé'),
 'On y a changé quelque chose et ça n’a pas encore pris. Soit on attend, soit on le dit explicitement et on assume.':
   b('On y a changé quelque chose et ça n’a pas encore pris. Soit on attend, soit on le dit explicitement et on assume.',
     'We changed something there and it hasn’t taken yet. Either we wait, or we say so plainly and own it.', ''),
 '« On peut y aller quand même, mais dites-le-moi clairement. »': b(q('On peut y aller quand même, mais dites-le-moi clairement.'), '“We can go anyway, but tell me plainly.”', ''),
 'Y ALLER QUAND MÊME': b('Y aller quand même', 'Go anyway', 'geste À ROUTE : `POST /v1/cue-stack/commit {acknowledge_compounding: true}`'),
 'j’assume le site qui bouge encore': b('j’assume le site qui bouge encore', 'I take on the site that’s still moving', ''),
 'Une suite d’ordres qu’on a mise de côté et qu’on relance d’un geste.': (S, 'carnet.bloc.une_suite_d_ordres_qu_on_met_de_cote_et_qu_on_relance_d_un_geste_cette_facon_de_faire_s_ouvre_plus_tard_il_faut_d_abord_monter_d_un_palier',
   '', '', 'même sens, servi plus long (avec « cette façon de faire s’ouvre plus tard… »)'),
 'Vos soirées mises de côté': b('Vos soirées mises de côté', 'Your saved evenings', 'la liste `named-sequences` (403 au palier 1)'),
 'La tournée courte': (N, '', '', '', SEQ), '4 ordres · cuisson, appro, deux passages': (N, '', '', '', SEQ), 'Le grand soir': (N, '', '', '', SEQ),
 '8 ordres · tout le circuit': (N, '', '', '', SEQ), '« La tournée courte, je la connais par cœur. Dites juste le mot. »': (N, '', '', '', SEQ),
 'REJOUER': b('Rejouer', 'Replay', '⚠️ la route de rejeu n’est pas vérifiée ici (seule la lecture, 403, l’est)'),
 'Vous ne pouvez pas encore mettre une soirée de côté.': b('Vous ne pouvez pas encore mettre une soirée de côté.', 'You can’t save an evening yet.', 'le 403 `NAMED_SEQUENCE_UNLOCK_REQUIRED`'),
 'Pour l’instant, chaque soirée se compose à la main.': b('Pour l’instant, chaque soirée se compose à la main.', 'For now, every evening is put together by hand.', ''),
 'METTRE CETTE SOIRÉE DE CÔTÉ': (N, '', '', '', 'geste : route d’enregistrement non vérifiée, et fermé au palier 1 — éteint (« pas encore possible »)'),
 'pas encore possible': b('pas encore possible', 'not possible yet', ''),
 'REJOUER « LA TOURNÉE COURTE »': nb('rejouer_nom', f'Rejouer «{NB}{{nom}}{NB}»', 'Replay “{nom}”', 'le nom de la soirée est une donnée'),
 'quatre ordres d’un coup': nb('n_ordres_d_un_coup', '{n, plural, one {un ordre} other {# ordres}} d’un coup', '{n, plural, one {one order} other {# orders}} at once', 'D15'),
 'Ce qui s’est passé en ville': b('Ce qui s’est passé en ville', 'What happened in town', 'titre (90) : `ambient/feed`, `random-world/active`'),
 'Ce qui bouge dans les quartiers où vous avez quelque chose.': b('Ce qui bouge dans les quartiers où vous avez quelque chose.', 'What’s moving in the districts where you have something.', ''),
 'Dans vos quartiers': b('Dans vos quartiers', 'In your districts', ''),
 'Une descente au Threnny': (N, '', '', '', VILLE), 'trois quartiers l’ont vue': (N, '', '', '', VILLE + ' ; aucune donnée ne compte les témoins (D15)'),
 'VOUS Y ÉTIEZ': b('Vous y étiez', 'You were there', 'la marque d’un événement suivi (`ambient/attend`) ; ⚠️ champ « suivi » à vérifier dans le corps servi'),
 'Un enterrement à Spine': (N, '', '', '', VILLE), 'la famille Coil y était': (N, '', '', '', VILLE + ' ; aucune donnée'),
 'Le pont du nord ferme': (N, '', '', '', VILLE), 'pour deux jours': (N, '', '', '', VILLE + ' ; aucune durée servie (D15)'), 'Bagarre au marché': (N, '', '', '', VILLE),
 'Ce qui se passe là où vous avez quelque chose.': b('Ce qui se passe là où vous avez quelque chose.', 'What’s going on where you have something.', ''),
 'Y être vu compte': b('Y être vu compte, dans un sens comme dans l’autre.', 'Being seen there counts, one way or the other.', 'une phrase en deux nœuds'),
 ', dans un sens comme dans l’autre.': (P, 'carnet.bloc.y_etre_vu_compte_dans_un_sens_comme_dans_l_autre', '', '', 'même phrase'),
 'ALLER À L’ENTERREMENT': b('Aller à l’enterrement', 'Go to the funeral', 'geste À ROUTE (`POST /v1/random-world/hollow/:eventId/attend-funeral`)'),
 'on vous y verra': b('on vous y verra', 'you’ll be seen there', ''),
 'Ce qui arrive': (N, '', '', '', CAL), 'Ce que la ville prépare, et ce qu’on peut faire contre.': (N, '', '', '', CAL),
 'Le conseil serre les docks': (N, '', '', '', CAL), '« Les contrôles doublent sur les quais nord. »': (N, '', '', '', CAL), 'Ce qu’on peut faire :': (N, '', '', '', CAL),
 'Passer par le sud, ou attendre.': (N, '', '', '', CAL), 'Élection au printemps': (N, '', '', '', CAL), 'annoncé': (N, '', '', '', CAL),
 '« Tout le monde veut être vu propre. »': (N, '', '', '', CAL), 'La ville ne vous prévient pas de tout — mais ce qui est': (N, '', '', '', CAL),
 ', on peut s’y préparer.': (N, '', '', '', CAL), 'Le calendrier ne donne': (N, '', '', '', CAL), 'aucune date': (N, '', '', '', CAL),
 ': ni quand ça finit, ni quand ça a commencé. Seulement': (N, '', '', '', CAL), 'ce qui est en cours': (N, '', '', '', CAL), 'et': (N, '', '', '', CAL),
 'ce qui est annoncé': (N, '', '', '', CAL),
}
COMPLEMENTS = [
 ('carnet.ordre.maintenance_batch', 'Faire l’entretien', 'Do the upkeep', 'PROPOSÉ (`slot_type` vivant, non dessiné)'),
 ('carnet.ordre.recruitment_step', 'Recruter', 'Recruit', 'PROPOSÉ (`slot_type` vivant, non dessiné)'),
 ('error.cue_stack.dependency_cycle', f'Ces ordres s’attendent les uns les autres{NB}: il faut en détacher un.', 'These orders wait on each other: unhook one of them.',
  'D14 + D12 : le servi dit « repères » (mot de ⑦) — valeur à aligner, clé gardée'),
 ('error.cue_stack.settling_compound_required', f'Un endroit n’a pas fini de se poser{NB}: dites-le clairement pour y aller quand même.',
  'A place hasn’t settled yet: say so plainly to go anyway.', 'D14 : le servi parle d’un « composé de stabilisation » — le mot de la maquette ; clé gardée'),
 ('error.cue_stack.slot_type_reserved', 'Cet ordre n’est pas encore possible.', 'This order isn’t possible yet.', 'D12 : le servi dit « emplacement… repère » ; clé gardée'),
]

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㉞' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
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
        # les clés `error.*` vivent dans les GABARITS D'ERREUR (resolveBundle = errorKeyTemplates ⊕ EN ⊕ FR), pas dans FR_MESSAGES
        if cle.startswith('error.') and f"'{cle}':" not in st: d.append(f'{cle} : annoncée servie (valeur à aligner), absente du fichier')
        if not cle.startswith('error.') and cle in FRV: d.append(f'{cle} : complément déjà servi')
        if re.search(r' [:;!?»]|« ', fr) or "'" in fr: d.append(f'{cle} : D17/D10')
        out.append('\t'.join(['(complément)', '', A if cle.startswith('error.') else P, cle, fr, en, note]))
    open(os.path.join(ICI, '46-carnet-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㉞ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
