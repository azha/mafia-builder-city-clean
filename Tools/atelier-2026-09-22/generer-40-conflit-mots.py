#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""40 — ㉙ le conflit : les 88 mots sans clé servie de ses cadres série 6 (59-66 ; balayage `34-…`), même format que la 37 (commande f2 du 23/09).
Classes : servie · servie · D14 (la maquette ratifiée l'emporte, la clé reste) · proposée · note. D12 à D17 appliquées ; gestes classés avec ou sans route.
Ratification : ㉙ est « ratifié par délégation » le 02/09 (`front.md` l.22). Les cadres 65-66 sont la **v1**, remplacée par la v2 (59-64) : un mot
qui n'est QUE dans la v1 est une note.
Données servies (back, lu) :
  `GET /v1/me/engagements` → `engagements[]` : `target_rival_key`, `target_rival_name_i18n`, `status` ∈ scheduled|resolved,
      `outcome_bucket` ∈ retreat|hold|contested|advance|breakthrough (ou null), `friction_consumed_bucket` ∈ low|medium|high,
      `heat_increment_bucket` (bande) — `combat.service.ts:85-103`, `combat-tunables.ts:47-53`, `friction-budget.service.ts:42-46` ;
  `POST /v1/me/engagements {lieutenant_id, target_rival_key, target_holding_id}` → le geste « l'envoyer ce soir » ; `GET /v1/lieutenants`.
Clés : `conflit.<rôle>.<slug>` — les rôles du client (`titre`, `sous_titre`, `bloc`, `Libelle.De("conflit", …)`) ; les bandes en familles neuves
`conflit.issue.*`, `conflit.cout.*`, `conflit.chaleur.*`.
⚠️ D14 — mots GENRÉS de la maquette ratifiée, NON corrigés, à la liste de l'user : voir `GENRES` (imprimés en fin de script).
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
CIBLE = ('le bâtiment visé (`target_holding_id`) : aucune route JOUEUR vérifiée ne liste les bâtiments d’une famille rivale '
         '(`rivals/:id/full-state` existe, non vérifié côté joueur) — nom d’exemple ; passé à côté ?')
MANQUE = 'panneau des manques (64) : ce que le jeu prévoit et que personne ne sert — pas un libellé ; le client dit déjà l’idée (`conflit.bloc.dessinees_pas_renseignees_…`)'
T = {
 'Le coup de ce soir': (P, 'conflit.bloc.le_coup_de_ce_soir', 'Le coup de ce soir', 'Tonight’s strike', 'titre du panneau d’envoi (59-61)'),
 'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.': (P, 'conflit.bloc.on_choisit_une_famille_on_choisit_un_homme_et_on_l_envoie_on_saura_demain',
   'On choisit une famille, on choisit un homme, et on l’envoie. On saura demain.', 'Pick a family, pick someone, and send them. We’ll know tomorrow.',
   '⚠️ D14 : « un homme » est genré (ratifié) → liste de l’user'),
 'On envoie': (P, 'conflit.bloc.on_envoie', 'On envoie', 'We send', 'la phrase d’envoi : « On envoie {nom} chez {famille}, sur {batiment}. »'),
 'chez': (P, 'conflit.bloc.on_envoie', '', '', 'morceau de la phrase d’envoi : même clé, à paramètres (une seule clé ICU : « On envoie {nom} chez {famille}, sur {batiment}. »)'),
 'sur': (P, 'conflit.bloc.on_envoie', '', '', 'idem'),
 'l’entrepôt de Dépôt-Est': (N, '', '', '', CIBLE), 'leur entrepôt du quai 4': (N, '', '', '', CIBLE), 'leur dépôt de Verrier': (N, '', '', '', CIBLE),
 'ce qu’on prend si ça marche': (N, '', '', '', 'aperçu du butin : aucune donnée servie ne le dit avant l’envoi (R2.2) — pas un libellé'),
 'la ferraille de leur dépôt': (N, '', '', '', 'idem (glose du butin)'),
 'Les quatre familles de Brennar': (A, 'conflit.bloc.les_quatre_familles', 'Les quatre familles de Brennar', 'The four families of Brennar',
   'servi « LES QUATRE FAMILLES » ; D14 : le mot ratifié ; la clé reste (exception à la dérivation, contrat additif)'),
 'C': (N, '', '', '', GLYPHE), 'T': (N, '', '', '', GLYPHE), 'G': (N, '', '', '', GLYPHE), 'S': (N, '', '', '', GLYPHE),
 'jamais': (P, 'conflit.bloc.fois_chez_eux', '{n, plural, =0 {jamais} one {# fois} other {# fois}}', '{n, plural, =0 {never} one {once} other {# times}}',
   'le compte des envois chez une famille, DÉRIVÉ de la liste servie (`engagements[]` par `target_rival_key`) ; une clé ICU couvre « jamais », « 1 fois », « 2 fois », « 7 fois »'),
 '1 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'), '2 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'),
 '7 fois': (P, 'conflit.bloc.fois_chez_eux', '', '', 'même clé ICU'),
 'on ne les a pas croisés': (P, 'conflit.bloc.on_ne_les_a_pas_croises', 'on ne les a pas croisés', 'we’ve never crossed paths', 'la ligne d’une famille à 0 envoi'),
 'on est allés chez eux': (P, 'conflit.bloc.on_est_alles_chez_eux', 'on est allés chez eux', 'we’ve been to them', 'la ligne du compte (suivie de `fois_chez_eux`)'),
 'CE SOIR': (P, 'conflit.bloc.ce_soir', 'Ce soir', 'Tonight', 'la marque de la famille choisie pour l’envoi'),
 '« Dites-moi seulement chez qui. Je pars ce soir, on saura demain. »': (A, 'conflit.bloc.dites_moi_qui_j_envoie_et_sur_quoi_je_pars_ce_soir_on_saura_demain',
   q('Dites-moi seulement chez qui. Je pars ce soir, on saura demain.'), '“Just tell me where. I’ll leave tonight, we’ll know tomorrow.”',
   'servi : le texte de la v1 (« Dites-moi qui j’envoie et sur quoi… ») ; D14 : la v2 ratifiée l’emporte ; la clé reste (exception à la dérivation)'),
 'L’ENVOYER CE SOIR': (P, 'conflit.bloc.l_envoyer_ce_soir', 'L’envoyer ce soir', 'Send them tonight',
   'geste À ROUTE : `POST /v1/me/engagements` ; ⚠️ D14 : « l’ » renvoie au lieutenant (genre non marqué à l’écrit, rien à signaler)'),
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
 'autre famille, autre bâtiment': (P, 'conflit.bloc.autre_famille_autre_batiment', 'autre famille, autre bâtiment', 'another family, another building', ''),
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
 'même famille, autre bâtiment': (P, 'conflit.bloc.meme_famille_autre_batiment', 'même famille, autre bâtiment', 'same family, another building', 'sous « Y retourner » (geste À ROUTE)'),
 'Ce qu’on ne peut pas faire': (N, '', '', '', MANQUE), 'Le jeu prévoit ces trois choses. Personne n’y touche encore.': (N, '', '', '', MANQUE),
 'Savoir qui elles sont': (N, '', '', '', MANQUE), 'ce qu’elles nous ont fait, où elles en sont, ce qu’elles préparent': (N, '', '', '', MANQUE),
 'Leur parler': (N, '', '', '', MANQUE), 'proposer, menacer, s’entendre, rompre': (N, '', '', '', MANQUE), 'Les faire suivre': (N, '', '', '', MANQUE),
 'savoir ce qu’elles préparent avant elles': (N, '', '', '', MANQUE), 'Ces trois choses': (N, '', '', '', MANQUE), 'existent dans le jeu': (N, '', '', '', MANQUE),
 ', mais personne n’y touche encore. Tant que c’est le cas, le conflit se joue': (N, '', '', '', MANQUE),
 'à l’aveugle et à sens unique': (N, '', '', '', MANQUE), ': on frappe, on ne parle pas, on ne voit pas venir.': (N, '', '', '', MANQUE),
 'Ce qu’on fait ce soir': (N, '', '', '', V1), 'qui part': (N, '', '', '', V1), 'sur quoi': (N, '', '', '', V1), 'ce qu’on prend': (N, '', '', '', V1),
 'elle a tout brûlé': (N, '', '', '', V1), 'le muscle · J7': (N, '', '', '', V1 + ' ; « J7 » : exemple (point 19)'),
 '« Dites-moi qui j’envoie et sur quoi. Je pars ce soir, on saura demain. »': (N, '', '', '', V1 + ' ; c’est le texte servi de `conflit.bloc.dites_moi_qui_j_envoie…` (remplacé, D14)'),
 'on saura demain, pas avant': (N, '', '', '', V1),
 '« Il est rentré. Regardez l’allumette : ce qu’il en reste vous dit ce que ça a donné. »': (N, '', '', '', V1),
 'l’allumette': (N, '', '', '', V1), 'ça s’est disputé': (N, '', '', '', V1 + ' ; la v2 dit « Disputé » (servi ailleurs)'), 'EN RENVOYER UN': (N, '', '', '', V1),
}
COMPLEMENTS = [
 ('conflit.issue.contested', 'Disputé', 'Contested', 'ratifié (63), déjà mot servi ailleurs'),
 ('conflit.issue.retreat', 'On a reculé', 'We fell back', 'PROPOSÉ : la maquette ne dessine pas `retreat`'),
 ('conflit.cout.high', 'beaucoup', 'a lot', 'PROPOSÉ'), ('conflit.chaleur.low', 'un peu', 'a little', 'même mot que le coût'),
 ('conflit.chaleur.medium', 'pas mal', 'quite a bit', 'même mot'), ('conflit.chaleur.high', 'beaucoup', 'a lot', 'PROPOSÉ'),
]
GENRES = ['« un homme » (59-61 : « on choisit un homme » ; 63 : « un homme envoyé »)', '« le rappeler », « on ne pourra plus le rappeler » (59-62)',
          '« Lt. Marr … il ne cogne pas » (61)', '« Les hommes qu’on a envoyés », « Deux hommes dehors » (62)', '« parti chez … », « Déjà rentrés » (62)',
          '« Ce que chaque homme a rapporté » (63)', '« Il est rentré » (63)', '« En envoyer un autre » (62)']

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
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and cle in FRV and fr and FRV[cle] != fr: ecarts.append(f'{cle} servie « {FRV[cle]} » ≠ « {fr} »')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        role = cle.split('.')[1] if cle else ''
        if cl == P and fr and role in ('bloc', 'titre', 'sous_titre') and 'plural' not in fr:
            base = re.sub(r'[«» ]', '', fr); base = re.sub(r'\{(\w+)\}', r'\1', base)
            if cle.split('.', 2)[2] != slug(base): d.append(f'{m} : {cle} ≠ slug « {slug(base)} »')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMPLEMENTS:
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, '40-conflit-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㉙ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    print('mots genrés ratifiés → liste de l’user (D14) :'); [print('   ', g) for g in GENRES]
    [print('  ≠', x) for x in ecarts]; [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
