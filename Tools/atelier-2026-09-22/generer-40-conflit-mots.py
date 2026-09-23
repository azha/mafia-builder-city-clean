#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""40 — ㉙ le conflit : les 88 mots sans clé servie de ses cadres série 6 (59-66 ; balayage `34-…`), même format que la 37 (commande f2 du 23/09).
Classes : servie · proposée · note (v3 : plus de « servie · D14 », ㉙ n'étant pas ratifiée). D12 à D17 appliquées ; gestes classés avec ou sans route.
Ratification — v3 (décision f2 du 23/09) : ㉙ n'est PAS ratifiée. `front.md` l.22 liste les maquettes ratifiées par délégation le 02/09
(㊲ ⑯ ② ⑨ ⑩ ㊱ ㉟ ㉓ ⑭ ⑮ ⑰ ㉒ ㉕) et ㉙ n'y est pas ; l.1328 dit « ratification user ✗ ». ⇒ ses cadres (59-66) sont une MAQUETTE À RATIFIER ;
aucun de ses mots n'est protégé par D14 (plus de classe « servie · D14 ») ; ses mots GENRÉS relèvent de D13 : formes ÉPICÈNES proposées
(`REECRITURES`), et ils sortent de la liste de l'user. Une clé déjà SERVIE garde son slug (contrat additif) et seule sa valeur change ;
une clé non servie suit la dérivation du nouveau fr ; les continuations suivent leur clé. La valeur RATIFIÉE du 409 (`ERROR_TEXT_RATIFIED`)
reste telle quelle : c'est un autre registre. Les cadres 65-66 sont la **v1**, remplacée par la v2 (59-64) : un mot qui n'est QUE dans la v1
est une note.
Données servies (back, lu) :
  `GET /v1/me/engagements` → `engagements[]` : `target_rival_key`, `target_rival_name_i18n`, `status` ∈ scheduled|resolved,
      `outcome_bucket` ∈ retreat|hold|contested|advance|breakthrough (ou null), `friction_consumed_bucket` ∈ low|medium|high,
      `heat_increment_bucket` (bande) — `combat.service.ts:85-103`, `combat-tunables.ts:47-53`, `friction-budget.service.ts:42-46` ;
  `POST /v1/me/engagements {lieutenant_id, target_rival_key, target_holding_id}` → le geste « l'envoyer ce soir » ; `GET /v1/lieutenants`.
  ⚠️ `target_holding_id` n'est PAS un bâtiment : c'est un des 5 axes d'érosion (muscle · finance · intel · infrastructure · leadership ;
  `engagements.controller.ts:166-183`) — famille neuve `conflit.axe.*` (mesure du back transmise par f2 le 23/09).
Clés : `conflit.<rôle>.<slug>` — les rôles du client (`titre`, `sous_titre`, `bloc`, `Libelle.De("conflit", …)`) ; les bandes en familles neuves
`conflit.issue.*`, `conflit.cout.*`, `conflit.chaleur.*`.
D13 — mots GENRÉS : formes épicènes proposées dans `REECRITURES` (imprimées en fin de script) ; rien ne va plus à la liste de l'user pour ㉙.
Sortie : `40-conflit-mots-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-40-conflit-mots.py"""
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
V1 = 'cadre de la v1 (65-66), remplacée par la v2 (59-64) : pas un libellé à servir'
GLYPHE = 'initiale de famille dans un médaillon : D11 — le nom servi l’accompagne (`conflit.bloc.<famille>`)'
CIBLE = ('DETTE DE MAQUETTE (point 19, mesure du back transmise par f2 le 23/09) : la maquette vise un BÂTIMENT, le back vise un AXE — '
         '`target_holding_id` est un des 5 axes d’érosion (`engagements.controller.ts:166-183`, `conflict_rival.ts:104-110`) ; aucune route '
         'joueur ne liste les tenues d’un rival, `rival_holding` n’a aucun écrivain de production (forme A, lot back futur)')
MANQUE = 'panneau des manques (64) : ce que le jeu prévoit et que personne ne sert — pas un libellé ; le client dit déjà l’idée (`conflit.bloc.dessinees_pas_renseignees_…`)'
T = {
 'Le coup de ce soir': (P, 'conflit.bloc.le_coup_de_ce_soir', 'Le coup de ce soir', 'Tonight’s strike', 'titre du panneau d’envoi (59-61)'),
 'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.': (P, 'conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain',
   'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.', 'Pick a family, pick someone, and send them. We’ll know tomorrow.',
   '⚠️ D14 : « un homme » est genré (ratifié) → liste de l’user'),
 'On envoie': (P, 'conflit.bloc.on_envoie_nom_chez_famille_sur_axe', 'On envoie {nom} chez {famille}, sur {axe}.', 'We send {nom} to {famille}, at {axe}.',
   'la phrase d’envoi, une clé à paramètres ; `{axe}` = `conflit.axe.*` (le back vise un AXE, pas un bâtiment : mesure transmise par f2)'),
 'chez': (P, 'conflit.bloc.on_envoie_nom_chez_famille_sur_axe', '', '', 'morceau de la phrase d’envoi : même clé'),
 'sur': (P, 'conflit.bloc.on_envoie_nom_chez_famille_sur_axe', '', '', 'idem'),
 'l’entrepôt de Dépôt-Est': (N, '', '', '', CIBLE), 'leur entrepôt du quai 4': (N, '', '', '', CIBLE), 'leur dépôt de Verrier': (N, '', '', '', CIBLE),
 'ce qu’on prend si ça marche': (N, '', '', '', 'aperçu du butin : aucune donnée servie ne le dit avant l’envoi (R2.2) — pas un libellé'),
 'la ferraille de leur dépôt': (N, '', '', '', 'idem (glose du butin)'),
 'Les quatre familles de Brennar': (P, 'conflit.bloc.les_quatre_familles', 'Les quatre familles de Brennar', 'The four families of Brennar',
   'servi « LES QUATRE FAMILLES » ; la maquette NON ratifiée propose « Les quatre familles de Brennar » (v3 : plus de D14) ; la clé reste (exception à la dérivation, contrat additif)'),
 'C': (N, '', '', '', GLYPHE), 'T': (N, '', '', '', GLYPHE), 'G': (N, '', '', '', GLYPHE), 'S': (N, '', '', '', GLYPHE),
 'jamais': (P, 'conflit.bloc.fois_chez_eux', '{n, plural, =0 {jamais} one {# fois} other {# fois}}', '{n, plural, =0 {never} one {once} other {# times}}',
   'le compte des envois chez une famille, DÉRIVÉ de la liste servie (`engagements[]` par `target_rival_key`) ; une clé ICU couvre « jamais », « 1 fois », « 2 fois », « 7 fois »'),
 '1 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'), '2 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'),
 '7 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'),
 'on ne les a pas croisés': (P, 'conflit.bloc.on_ne_les_a_pas_croises', 'on ne les a pas croisés', 'we’ve never crossed paths', 'la ligne d’une famille à 0 envoi'),
 'on est allés chez eux': (P, 'conflit.bloc.on_est_alles_chez_eux', 'on est allés chez eux', 'we’ve been to them', 'la ligne du compte (suivie de `fois_chez_eux`)'),
 'CE SOIR': (P, 'conflit.bloc.ce_soir', 'Ce soir', 'Tonight', 'la marque de la famille choisie pour l’envoi'),
 '« Dites-moi seulement chez qui. Je pars ce soir, on saura demain. »': (P, 'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain',
   q('Dites-moi seulement chez qui. Je pars ce soir, on saura demain.'), '“Just tell me where. I’ll leave tonight, we’ll know tomorrow.”',
   'servi : le texte de la v1 (« Dites-moi qui j’envoie et sur quoi… ») ; la v2 (NON ratifiée) est proposée ; la clé reste (exception à la dérivation)'),
 'L’ENVOYER CE SOIR': (P, 'conflit.bloc.l_envoyer_ce_soir', 'L’envoyer ce soir', 'Send them tonight',
   'geste À ROUTE : `POST /v1/me/engagements` ; D13 : « l’ » élidé, aucun genre marqué à l’écrit'),
 'on ne pourra plus le rappeler': (P, 'conflit.bloc.on_ne_pourra_plus_le_rappeler', 'on ne pourra plus le rappeler', 'there’s no calling them back',
   'aucune route d’annulation (mesuré) ; ⚠️ D14 : « le » genré → liste de l’user'),
 'La dernière fois chez eux :': (P, 'conflit.bloc.la_derniere_fois_chez_eux', f'La dernière fois chez eux{NB}:', 'Last time at theirs:',
   'suivie de l’issue du dernier envoi résolu (`outcome_bucket`) ; D17 : insécable avant « : »'),
 'percée': (P, 'conflit.issue.breakthrough', 'Percée', 'Breakthrough', 'même mot que « Percée » (63)'),
 ', et la ville a chauffé': (P, 'conflit.bloc.et_la_ville_a_chauffe', ', et la ville a chauffé', ', and the city heated up', 'suite de « La dernière fois… » quand `heat_increment_bucket` n’est pas nul'),
 '« Lt. Marr tient les comptes, il ne cogne pas. Et Saltline, on ne l’a jamais croisée — je ne saurais pas où frapper. »':
   (P, 'conflit.bloc.nom_tient_les_comptes_il_ne_cogne_pas_et_famille_on_ne_l_a_jamais_croisee_je_ne_saurais_pas_ou_frapper',
    q('{nom} tient les comptes, il ne cogne pas. Et {famille}, on ne l’a jamais croisée — je ne saurais pas où frapper.'),
    '“{nom} keeps the books, doesn’t throw punches. And {famille}, we’ve never crossed them — I wouldn’t know where to hit.”',
    'le refus « deux choses ne collent pas » (61) : un lieutenant qui n’est pas du genre Gros bras (servi : `conflit.bloc.aucun_de_vos_lieutenants_n_est_du_genre_gros_bras`) ET une famille jamais croisée ; noms → `{nom}`, `{famille}` ; ⚠️ D14 : « il » genré → liste de l’user'),
 'deux choses ne collent pas': (P, 'conflit.bloc.deux_choses_ne_collent_pas', 'deux choses ne collent pas', 'two things don’t add up', ''),
 'Ce qui est en cours': (P, 'conflit.bloc.ce_qui_est_en_cours', 'Ce qui est en cours', 'What’s under way', 'les envois `status` = scheduled (62)'),
 'Les hommes qu’on a envoyés et qui ne sont pas encore rentrés.': (P, 'conflit.bloc.les_hommes_qu_on_a_envoyes_et_qui_ne_sont_pas_encore_rentres',
   'Les hommes qu’on a envoyés et qui ne sont pas encore rentrés.', 'The ones we sent who aren’t back yet.', '⚠️ D14 : « les hommes » genré → liste de l’user'),
 'Partis, pas encore rentrés': (P, 'conflit.bloc.partis_pas_encore_rentres', 'Partis, pas encore rentrés', 'Out, not back yet', 'section `scheduled`'),
 'parti chez Tarcum': (P, 'conflit.bloc.parti_chez_famille', 'parti chez {famille}', 'gone to {famille}', '⚠️ D14 : « parti » genré → liste de l’user ; ⚠️ l’article : « chez la Coil » contre le servi « La Coil »'),
 'parti chez Gorge-de-Fer': (P, 'conflit.bloc.parti_chez_famille', '', '', 'même clé'),
 'on ne peut plus': (P, 'conflit.bloc.on_ne_peut_plus_le_rappeler', 'on ne peut plus le rappeler', 'there’s no calling them back', 'une phrase en deux nœuds ; ⚠️ D14 : « le » genré'),
 'le rappeler': (P, 'conflit.bloc.on_ne_peut_plus_le_rappeler', '', '', 'fin de la phrase précédente'),
 'Déjà rentrés': (P, 'conflit.bloc.deja_rentres', 'Déjà rentrés', 'Already back', 'section `resolved` ; ⚠️ D14 : « rentrés » accordé'),
 'était chez la Coil': (P, 'conflit.bloc.etait_chez_famille', 'était chez {famille}', 'was at {famille}', ''),
 'était chez Tarcum': (P, 'conflit.bloc.etait_chez_famille', '', '', 'même clé'),
 'Rien obtenu': (P, 'conflit.issue.hold', 'Rien obtenu', 'Nothing gained', '`outcome_bucket` = hold'),
 'Deux hommes dehors.': (P, 'conflit.bloc.hommes_dehors', '{n, plural, one {Un homme dehors.} other {# hommes dehors.}}', '{n, plural, one {One out.} other {# out.}}',
   'le compte des `scheduled` ; D15 : le nombre vient de la liste ; ⚠️ D14 : « hommes » genré → liste de l’user'),
 'On ne les rappelle pas': (P, 'conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin', 'On ne les rappelle pas — on saura demain matin.',
   'No calling them back — we’ll know tomorrow morning.', 'une phrase en deux nœuds'),
 '— on saura demain matin.': (P, 'conflit.bloc.on_ne_les_rappelle_pas_on_saura_demain_matin', '', '', 'fin de la phrase précédente (« matin » est de la prose, pas une phase : D16 hors champ)'),
 'EN ENVOYER UN AUTRE': (P, 'conflit.bloc.en_envoyer_un_autre', 'En envoyer un autre', 'Send another one', 'geste À ROUTE (`POST /v1/me/engagements`) ; ⚠️ D14 : « un autre » genré'),
 'autre famille, autre bâtiment': (P, 'conflit.bloc.autre_famille_autre_cible', 'autre famille, autre cible', 'another family, another target',
   'maquette en retard (point 19) : le back vise un axe, pas un bâtiment → « autre cible »'),
 'Ce qui est rentré': (P, 'conflit.bloc.ce_qui_est_rentre', 'Ce qui est rentré', 'What came back', 'les envois `resolved` (63)'),
 'Ce que chaque homme a rapporté, et ce que ça nous a coûté.': (P, 'conflit.bloc.ce_que_chaque_homme_a_rapporte_et_ce_que_ca_nous_a_coute',
   'Ce que chaque homme a rapporté, et ce que ça nous a coûté.', 'What each one brought back, and what it cost us.', '⚠️ D14 : « chaque homme » genré'),
 'Il est rentré': (P, 'conflit.bloc.il_est_rentre', 'Il est rentré', 'They’re back', '⚠️ D14 : « Il », « rentré » genrés → liste de l’user'),
 'ça nous a coûté': (P, 'conflit.bloc.ca_nous_a_coute', 'ça nous a coûté', 'it cost us', 'la ligne de `friction_consumed_bucket`'),
 'un peu': (P, 'conflit.cout.low', 'un peu', 'a little', '`friction_consumed_bucket` = low ; même mot pour `conflit.chaleur.low`'),
 'pas mal': (P, 'conflit.cout.medium', 'pas mal', 'quite a bit', '= medium ; même mot pour `conflit.chaleur.medium`'),
 'la ville a chauffé': (P, 'conflit.bloc.la_ville_a_chauffe', 'la ville a chauffé', 'the city heated up', 'la ligne de `heat_increment_bucket`'),
 'Depuis le début, chez Tarcum': (P, 'conflit.bloc.depuis_le_debut_chez_famille', 'Depuis le début, chez {famille}', 'From the start, at {famille}', 'l’historique par famille (liste servie)'),
 'Coup n°4': (P, 'conflit.bloc.coup_n_n', 'Coup n°{n}', 'Strike #{n}', 'le rang de l’envoi dans l’historique (dérivé de la liste) ; D15 : le nombre vient de la liste'),
 'Coup n°5': (P, 'conflit.bloc.coup_n_n', '', '', 'même clé'), 'Coup n°6': (P, 'conflit.bloc.coup_n_n', '', '', 'même clé'), 'Coup n°7': (P, 'conflit.bloc.coup_n_n', '', '', 'même clé'),
 'un homme envoyé': (P, 'conflit.bloc.un_homme_envoye', 'un homme envoyé', 'one sent', '⚠️ D14 : « un homme » genré'),
 'Percée': (P, 'conflit.issue.breakthrough', 'Percée', 'Breakthrough', '`outcome_bucket` = breakthrough'),
 'Terrain gagné': (P, 'conflit.issue.advance', 'Terrain gagné', 'Ground gained', '= advance'),
 '« Voilà ce que ça a donné. À vous de dire si on y retourne. »': (P, 'conflit.bloc.voila_ce_que_ca_a_donne_a_vous_de_dire_si_on_y_retourne',
   q('Voilà ce que ça a donné. À vous de dire si on y retourne.'), '“That’s how it went. Your call whether we go back.”', ''),
 'même famille, autre bâtiment': (P, 'conflit.bloc.meme_famille_autre_cible', 'même famille, autre cible', 'same family, another target',
   'sous « Y retourner » (geste À ROUTE) ; maquette en retard (point 19) → « autre cible »'),
 'Ce qu’on ne peut pas faire': (N, '', '', '', MANQUE), 'Le jeu prévoit ces trois choses. Personne n’y touche encore.': (N, '', '', '', MANQUE),
 'Savoir qui elles sont': (N, '', '', '', MANQUE), 'ce qu’elles nous ont fait, où elles en sont, ce qu’elles préparent': (N, '', '', '', MANQUE),
 'Leur parler': (N, '', '', '', MANQUE), 'proposer, menacer, s’entendre, rompre': (N, '', '', '', MANQUE), 'Les faire suivre': (N, '', '', '', MANQUE),
 'savoir ce qu’elles préparent avant elles': (N, '', '', '', MANQUE), 'Ces trois choses': (N, '', '', '', MANQUE), 'existent dans le jeu': (N, '', '', '', MANQUE),
 ', mais personne n’y touche encore. Tant que c’est le cas, le conflit se joue': (N, '', '', '', MANQUE),
 'à l’aveugle et à sens unique': (N, '', '', '', MANQUE), ': on frappe, on ne parle pas, on ne voit pas venir.': (N, '', '', '', MANQUE),
 'Ce qu’on fait ce soir': (N, '', '', '', V1), 'qui part': (N, '', '', '', V1), 'sur quoi': (N, '', '', '', V1), 'ce qu’on prend': (N, '', '', '', V1),
 'elle a tout brûlé': (N, '', '', '', V1), 'le muscle · J7': (N, '', '', '', V1 + ' ; « J7 » : exemple (point 19)'),
 '« Dites-moi qui j’envoie et sur quoi. Je pars ce soir, on saura demain. »': (N, '', '', '', V1 + ' ; c’est le texte servi de `conflit.bloc.dites_moi_qui_j_envoie…` (la v2 est proposée)'),
 'on saura demain, pas avant': (N, '', '', '', V1),
 '« Il est rentré. Regardez l’allumette : ce qu’il en reste vous dit ce que ça a donné. »': (N, '', '', '', V1),
 'l’allumette': (N, '', '', '', V1), 'ça s’est disputé': (N, '', '', '', V1 + ' ; la v2 dit « Disputé » (servi ailleurs)'), 'EN RENVOYER UN': (N, '', '', '', V1),
}
COMPLEMENTS = [
 ('conflit.axe.muscle', 'leurs gros bras', 'their muscle', 'PROPOSÉ — « gros bras » est le mot servi de l’archétype (`famille.archetype.gros_bras`)'),
 ('conflit.axe.finance', 'leur argent', 'their money', 'PROPOSÉ'),
 ('conflit.axe.intel', 'leurs informateurs', 'their informants', 'PROPOSÉ'),
 ('conflit.axe.infrastructure', 'leurs installations', 'their premises', 'PROPOSÉ'),
 ('conflit.axe.leadership', 'leur tête', 'their leadership', 'PROPOSÉ'),
 ('conflit.issue.contested', 'Disputé', 'Contested', 'PROPOSÉ (63, maquette non ratifiée) ; déjà mot servi ailleurs'),
 ('conflit.issue.retreat', 'On a reculé', 'We fell back', 'PROPOSÉ : la maquette ne dessine pas `retreat`'),
 ('conflit.cout.high', 'beaucoup', 'a lot', 'PROPOSÉ'), ('conflit.chaleur.low', 'un peu', 'a little', 'même mot que le coût'),
 ('conflit.chaleur.medium', 'pas mal', 'quite a bit', 'même mot'), ('conflit.chaleur.high', 'beaucoup', 'a lot', 'PROPOSÉ'),
]
# D13 (v3) : mot de la maquette → (fr épicène, en). La clé : gardée si SERVIE (contrat additif), sinon dérivée du nouveau fr (ou nommée).
REECRITURES = {
 'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.': ('On choisit une famille, on choisit qui y envoyer. On saura demain.', 'Pick a family, pick who to send. We’ll know tomorrow.'),
 'on est allés chez eux': ('on leur a rendu visite', 'we’ve paid them a visit'),
 'on ne les a pas croisés': ('on n’a jamais croisé leur route', 'we’ve never crossed paths'),
 'on ne pourra plus le rappeler': ('pas de rappel possible', 'no calling back'),
 '« Lt. Marr tient les comptes, il ne cogne pas. Et Saltline, on ne l’a jamais croisée — je ne saurais pas où frapper. »':
   (q('{nom}, c’est les comptes, pas les coups. Et {famille}, on ne l’a jamais croisée — je ne saurais pas où frapper.'),
    '“{nom} is about the books, not the punches. And {famille}, we’ve never crossed them — I wouldn’t know where to hit.”'),
 'Les hommes qu’on a envoyés et qui ne sont pas encore rentrés.': ('Ce qu’on a envoyé et qui n’est pas encore rentré.', 'What we sent that isn’t back yet.'),
 'Partis, pas encore rentrés': ('En route, pas encore de retour', 'Out, not back yet'),
 'parti chez Tarcum': ('en route vers {famille}', 'on the way to {famille}'),
 'on ne peut plus': ('plus de rappel possible', 'no calling back now'),
 'Déjà rentrés': ('Déjà de retour', 'Already back'),
 'Deux hommes dehors.': ('{n, plural, one {Une personne dehors.} other {# personnes dehors.}}', '{n, plural, one {One out.} other {# out.}}'),
 'EN ENVOYER UN AUTRE': ('Envoyer quelqu’un d’autre', 'Send someone else'),
 'Ce que chaque homme a rapporté, et ce que ça nous a coûté.': ('Ce que chaque envoi a rapporté, et ce que ça nous a coûté.', 'What each run brought back, and what it cost us.'),
 'Il est rentré': ('De retour', 'Back'),
 'un homme envoyé': ('un envoi', 'one sent'),
}
NOMMEES = {'Deux hommes dehors.': 'conflit.bloc.personnes_dehors'}   # clé à paramètre ICU, nommée

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㉙' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d, ecarts, out, comptes = [], [], ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    if set(mots) != set(T): d.append(f'non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    renomme, exceptions = {}, set()
    for m, (fr2, en2) in REECRITURES.items():
        cl, cle, fr, en, note = T[m]
        if cle in FRV:
            nouvelle = cle; exceptions.add(cle); quoi = f'clé SERVIE gardée (contrat additif), valeur changée'
        else:
            nouvelle = NOMMEES.get(m) or cle.rsplit('.', 1)[0] + '.' + slug(re.sub(r'\{(\w+)\}', r'\1', re.sub(r'[«» ]', '', fr2)))
            quoi = f'clé dérivée du nouveau fr (ancienne, non servie : `{cle}`)' if nouvelle != cle else 'clé inchangée'
            if m in NOMMEES: exceptions.add(nouvelle)
        renomme[cle] = nouvelle
        T[m] = (P, nouvelle, fr2, en2, f'D13 (v3, ㉙ non ratifiée) : la maquette dit « {fr} » ; forme épicène proposée ; {quoi}')
    for m, (cl, cle, fr, en, note) in list(T.items()):
        if cle in renomme and not fr: T[m] = (cl, renomme[cle], fr, en, note)
    exceptions |= {'conflit.bloc.les_quatre_familles', 'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain'}
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and cle in FRV and fr and FRV[cle] != fr: ecarts.append(f'{cle} servie « {FRV[cle]} » ≠ « {fr} »')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        role = cle.split('.')[1] if cle else ''
        if cl == P and fr and role in ('bloc', 'titre', 'sous_titre') and 'plural' not in fr:
            base = re.sub(r'[«» ]', '', fr); base = re.sub(r'\{(\w+)\}', r'\1', base)
            if cle not in exceptions and cle.split('.', 2)[2] != slug(base): d.append(f'{m} : {cle} ≠ slug « {slug(base)} »')
        if re.search(r'\b(homme|hommes|[Ii]l est|partis?|rentrés|allés|croisés)\b', fr): d.append(f'{m} : forme genrée restante (D13)')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMPLEMENTS:
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, '40-conflit-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㉙ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    print(f'D13 (v3) : {len(REECRITURES)} mots réécrits en formes épicènes ; clés servies gardées : {sorted(k for k in renomme if renomme[k] == k and k in FRV)} ; '
          f'clés renommées (non servies) : {len([k for k in renomme if renomme[k] != k])} ; liste de l’user pour ㉙ : vide')
    [print('  ≠', x) for x in ecarts]; [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
