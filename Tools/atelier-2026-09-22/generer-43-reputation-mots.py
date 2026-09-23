#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""43 — ㊲ la réputation (« le miroir ») : les mots sans clé servie de ses cadres série 6 (119-124, 144 ; balayage `34-…`), même format que 37 et 40
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12 à D17 appliquées ; gestes classés avec ou sans route.
Ratification : ㊲ « ratifié par délégation » le 02/09 (`front.md` l.22).
Données servies (back `37d4e290`, lu — `reputation-hub.service.ts:55-138`) :
  `GET /v1/me/reputation/:lieutenant_id` → `boss_mirror { portrait_posture ∈ attentive|cautious|withdrawn|hostile, declared_rules[{rule_id}],
      consistency_cue ∈ aligned|drifting|indeterminate }`, `hidden_curriculum.uniform_tells { collar ∈ buttoned|open, sleeves ∈ rolled|down,
      watch ∈ visible|hidden, gloves ∈ clean|dirty }` ; `POST /v1/me/house-rules` (donner une règle) ; `GET /v1/lieutenants/:id` (`name`, servi).
  Déjà au catalogue : `reputation.bloc.*` (5), `reputation.etat.*` (16 : postures, cohérence, vertus, offres).
  NON servis (les lots de la maquette, cadre 124) : le texte d'une règle (L1 — `rule_id` seul), le retrait (L2 — code sans route), la règle
  enfreinte (L3), la liste des règles possibles (L4), la liste des rappelés (L5), les noms des contreparties (L6).
Clés : `reputation.<rôle>.<slug>` (le client : `Libelle.De("reputation", "bloc", …)`) ; familles neuves pour les 4 indices de tenue :
`reputation.col.*`, `reputation.manches.*`, `reputation.montre.*`, `reputation.gants.*`.
⚠️ D14 — mots GENRÉS de la maquette ratifiée, NON corrigés, à la liste de l'user : `GENRES` (imprimés).
Sortie : `43-reputation-mots-2026-09-23.tsv`. Usage : python3 Tools/atelier-2026-09-22/generer-43-reputation-mots.py"""
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
LOT = lambda l, q: f'panneau des lots (124) — {l} : {q} ; pas un libellé'
DA = 'note de DA dans le téléphone (explication de la maquette, pas un libellé du joueur)'
L2 = 'le RETRAIT n’a aucune route (L2) : un mot qui le promet ou le nomme attend L2'
L5 = 'le cadre des gages n’est pas atteignable : rien ne liste les rappelés (L5)'
T = {
 'ce qu’il a pris de vous se voit sur lui': (P, 'reputation.bloc.ce_qu_il_a_pris_de_vous_se_voit_sur_lui', 'ce qu’il a pris de vous se voit sur lui',
   'what they’ve taken from you shows on them', 'sous-titre du miroir ; ⚠️ D14 : « il », « lui » genrés → liste de l’user'),
 'règles données': (P, 'reputation.bloc.regles_donnees', 'règles données', 'rules given', 'le compte de `declared_rules[]` (servi, dérivé de la liste)'),
 'absorbées': (P, 'reputation.bloc.absorbees', 'absorbées', 'absorbed', 'le compte des 4 indices de tenue au bon côté (« /4 ») ; s’accorde aux règles'),
 'enfreintes': (N, '', '', '', 'le compte des règles enfreintes n’est PAS servi (L3 : « le rule_id enfreint est en base, jamais projeté ») — ne pas l’afficher'),
 'Lt. Hara, votre lieutenant': (P, 'reputation.bloc.nom_votre_lieutenant', '{nom}, votre lieutenant', '{nom}, your lieutenant',
   'le nom est servi par `GET /v1/lieutenants/:id` ; « Lt. Hara » est un exemple → `{nom}`'),
 'lieutenant.name — non projeté (L0.4)': (N, '', '', '', 'annotation de lot de la maquette (le nom est servi aujourd’hui par `GET /v1/lieutenants/:id`) — pas un libellé'),
 'col boutonné': (P, 'reputation.col.buttoned', 'col boutonné', 'collar buttoned', '`uniform_tells.collar` = buttoned (ratifié 119)'),
 'col ouvert': (P, 'reputation.col.open', 'col ouvert', 'collar open', '= open (ratifié 120, 123)'),
 'manches basses': (P, 'reputation.manches.down', 'manches basses', 'sleeves down', '`sleeves` = down'),
 'manches roulées': (P, 'reputation.manches.rolled', 'manches roulées', 'sleeves rolled', '= rolled'),
 'montre visible': (P, 'reputation.montre.visible', 'montre visible', 'watch showing', '`watch` = visible'),
 'montre cachée': (P, 'reputation.montre.hidden', 'montre cachée', 'watch hidden', '= hidden'),
 'gants sales': (P, 'reputation.gants.dirty', 'gants sales', 'gloves dirty', '`gloves` = dirty'),
 'gants propres': (P, 'reputation.gants.clean', 'gants propres', 'gloves clean', '= clean'),
 'la règle du jeu': (P, 'reputation.bloc.la_regle_du_jeu', 'la règle du jeu', 'how it works', 'le surtitre du panneau d’explication (voix du joueur, 119)'),
 'Vous vous lisez sur lui': (P, 'reputation.bloc.vous_vous_lisez_sur_lui', 'Vous vous lisez sur lui', 'You can read yourself on them',
   '⚠️ D14 : « lui » genré → liste de l’user'),
 'chaque vertu qu’il vous voit tenir finit sur sa tenue — col, manches, montre, gants. Une règle déclarée tient':
   (P, 'reputation.bloc.chaque_vertu_qu_il_vous_voit_tenir_finit_sur_sa_tenue_col_manches_montre_gants',
    'chaque vertu qu’il vous voit tenir finit sur sa tenue — col, manches, montre, gants.', 'every virtue they see you keep ends up on their outfit — collar, sleeves, watch, gloves.',
    'la phrase COUPÉE à « gants. » : la suite (« Une règle déclarée tient jusqu’à ce que vous la retiriez publiquement… ») promet le retrait (L2) ; ⚠️ D14 : « il » genré'),
 'jusqu’à ce que vous la retiriez publiquement': (N, '', '', '', L2),
 ': la donner, c’est se donner une corde.': (N, '', '', '', L2 + ' (fin de la même phrase)'),
 'un lieutenant neuf n’a encore rien absorbé': (P, 'reputation.bloc.un_lieutenant_neuf_n_a_encore_rien_absorbe', 'un lieutenant neuf n’a encore rien absorbé',
   'a new lieutenant hasn’t absorbed anything yet', 'sous-titre de l’état vide (120) ; ⚠️ D14 : « neuf » s’accorde à « lieutenant », pas à la personne — rien à signaler'),
 '« pas jugeable » n’est pas « moyen »': (N, '', '', '', DA),
 'Rien n’a encore déteint': (P, 'reputation.bloc.rien_n_a_encore_deteint', 'Rien n’a encore déteint', 'Nothing has rubbed off yet', 'titre de l’état vide (120)'),
 'ses quatre voyants sont éteints parce qu’il n’a': (N, '', '', '', DA), 'rien pris de vous': (N, '', '', '', DA),
 '— pas parce qu’il est médiocre. Et personne ne jugera votre constance tant qu’il n’a pas assez vu :': (N, '', '', '', DA),
 'indéterminé': (N, '', '', '', DA + ' ; la valeur servie est « Pas encore jugeable » (`reputation.etat.pas_encore_jugeable`)'),
 ', jamais au milieu d’une jauge.': (N, '', '', '', DA),
 'DONNER UNE PREMIÈRE RÈGLE': (P, 'reputation.bloc.donner_une_premiere_regle', 'Donner une première règle', 'Give a first rule',
   'geste À ROUTE (`POST /v1/me/house-rules`) ; ⚠️ L4 : rien ne liste les règles possibles'),
 'vous vous écartez de vos propres règles': (P, 'reputation.bloc.vous_vous_ecartez_de_vos_propres_regles', 'vous vous écartez de vos propres règles',
   'you’re straying from your own rules', 'sous-titre de `consistency_cue` = drifting (121)'),
 'ce qui a changé': (P, 'reputation.bloc.ce_qui_a_change', 'ce qui a changé', 'what changed', ''),
 'Une règle donnée, une règle enfreinte': (N, '', '', '', 'le compte des enfreintes n’est pas servi (L3)'),
 'vous avez laissé passer ce que vous aviez interdit. Les deux cercles l’enregistrent — le vôtre et le sien. ⚠️ on vous dit que vous dérivez,': (N, '', '', '', DA + ' (porte un ⚠️)'),
 'jamais sur quelle règle': (N, '', '', '', DA + ' (L3)'), ': ce n’est pas un choix, c’est ce qui manque encore.': (N, '', '', '', DA),
 'retirées': (N, '', '', '', L2),
 'On ne touche pas aux familles': (N, '', '', '', 'texte de règle d’EXEMPLE : `declared_rules` ne sert que `rule_id` (L1) — dette de maquette'),
 'Personne ne travaille le dimanche': (N, '', '', '', 'idem (L1)'), 'Jamais de crick chez les gosses': (N, '', '', '', 'idem (L1)'),
 'retirer une règle': (N, '', '', '', L2), 'Le geste n’existe pas encore': (N, '', '', '', DA + ' (L2)'),
 'le canon veut qu’une règle se retire': (N, '', '', '', DA + ' (L2)'), 'en public': (N, '', '', '', DA + ' (L2)'),
 '; le code du retrait existe mais': (N, '', '', '', DA + ' (L2)'), 'aucune route de production ne l’appelle': (N, '', '', '', DA + ' (L2)'),
 '. Tant que ce maillon manque, une règle donnée est définitive.': (N, '', '', '', DA + ' (L2)'),
 'un lieutenant rappelé — on demande des gages': (N, '', '', '', L5), 'rappelé': (N, '', '', '', L5), 'règlements': (N, '', '', '', L5 + ' ; L6'),
 'noms — lot back': (N, '', '', '', L5 + ' ; L6'), 'Le rappelé, votre lieutenant': (N, '', '', '', L5 + ' ; ⚠️ D14 : « rappelé » genré → liste de l’user'),
 'les gages': (N, '', '', '', L5),
 'On vient, mais avec des garanties': (A, 'reputation.etat.on_demande_des_gages', 'On vient, mais avec des garanties', 'We’ll come, but with guarantees',
   'servi « On demande des gages » pour la même offre ; D14 : la phrase ratifiée l’emporte, la clé reste (exception à la dérivation) — à confirmer : le cadre est inatteignable (L5)'),
 'ses derniers règlements sont au registre —': (N, '', '', '', L5 + ' ; L6'), 'sans nom': (N, '', '', '', 'L6 : aucune table de noms des contreparties'),
 ': la maison ne tient pas encore de table des contreparties.': (N, '', '', '', 'L6'),
 'règlement n°12': (N, '', '', '', 'L6 : identifiant « settlement-N », aucun nom'), 'règlement n°13': (N, '', '', '', 'L6'), 'règlement n°14': (N, '', '', '', 'L6'),
 'CHOISIR UN RAPPELÉ — AUCUNE LISTE': (N, '', '', '', L5 + ' ; geste SANS route'),
 'ce cadre n’est pas atteignable aujourd’hui : rien ne liste les lieutenants rappelés —': (N, '', '', '', DA + ' (L5)'), 'lot back L5': (N, '', '', '', DA),
 'maillons': (N, '', '', '', LOT('titre', 'les maillons manquants')),
 'L1 — Écrire le texte des règles': (N, '', '', '', LOT('L1', 'le texte des règles')), 'rule_id est un identifiant ; aucun libellé n’existe': (N, '', '', '', LOT('L1', '')),
 'L2 — Retirer une règle': (N, '', '', '', LOT('L2', 'le retrait')), 'le code existe, aucun appelant de production': (N, '', '', '', LOT('L2', '')),
 'L3 — Dire QUELLE règle a été enfreinte': (N, '', '', '', LOT('L3', 'la règle enfreinte')), 'le rule_id enfreint est en base, jamais projeté': (N, '', '', '', LOT('L3', '')),
 'L4 — La liste des règles possibles': (N, '', '', '', LOT('L4', 'les règles possibles')), 'déclarer exige un id ; rien ne dit lesquels existent': (N, '', '', '', LOT('L4', '')),
 'L5 — Lister les lieutenants rappelés': (N, '', '', '', LOT('L5', 'les rappelés')), 'sans elle, le cadre des gages est inatteignable': (N, '', '', '', LOT('L5', '')),
 'L6 — Nommer les contreparties': (N, '', '', '', LOT('L6', 'les contreparties')), '« settlement-N » ; aucune table de noms': (N, '', '', '', LOT('L6', '')),
 'L7 — Projeter le nom du lieutenant': (N, '', '', '', LOT('L7', 'le nom — servi aujourd’hui par `GET /v1/lieutenants/:id`')),
 'en base NOT NULL, absent des 2 projections — L0.4': (N, '', '', '', LOT('L7', '')),
 'le plus court d’abord': (N, '', '', '', LOT('ordre', '')), 'L5 débloque un cadre entier': (N, '', '', '', LOT('ordre', '')),
 'la liste des rappelés rend les gages atteignables ; L6 et L7 rejoignent la table de noms du Lot 0.': (N, '', '', '', LOT('ordre', '')),
 'il a déjà pris de vous, pas encore de quoi le lire': (P, 'reputation.bloc.il_a_deja_pris_de_vous_pas_encore_de_quoi_le_lire',
   'il a déjà pris de vous, pas encore de quoi le lire', 'they’ve already taken from you, not enough to read yet',
   'sous-titre de `consistency_cue` = indeterminate AVEC de l’absorbé (144) ; ⚠️ D14 : « il » genré'),
 'ni l’un ni l’autre': (P, 'reputation.bloc.ni_l_un_ni_l_autre', 'ni l’un ni l’autre', 'neither one nor the other', 'la cohérence indéterminée (144)'),
 'Deux vertus sur lui, pas encore un verdict': (P, 'reputation.bloc.n_vertus_sur_lui_pas_encore_un_verdict',
   '{n, plural, one {Une vertu sur lui} other {# vertus sur lui}}, pas encore un verdict', '{n, plural, one {One virtue on them} other {# virtues on them}}, no verdict yet',
   'D15 : « Deux » vient du compte des indices au bon côté → ICU ; ⚠️ D14 : « lui » genré'),
 'il a retenu des choses de vous — et le serveur ne dit': (N, '', '', '', DA + ' (« le serveur »)'),
 'toujours pas': (N, '', '', '', DA), 'si vous vous y tenez. Ce n’est pas un cran entre les deux : c’est l’absence de verdict, avec de l’absorbé.': (N, '', '', '', DA),
}
GENRES = ['« ce qu’il a pris de vous se voit sur lui » (119, sous-titre)', '« Vous vous lisez sur lui » (119)', '« chaque vertu qu’il vous voit tenir finit sur sa tenue » (119)',
          '« il a déjà pris de vous » (144)', '« Deux vertus sur lui » (144)', '« Le rappelé, votre lieutenant » (123)',
          'et au CATALOGUE servi : `reputation.etat.il_vous_ecoute`, `il_se_tient_a_carreau`, `il_se_ferme`, `il_vous_en_veut` (« Il … »)']

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㊲' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d, out, comptes = [], ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    if set(mots) != set(T): d.append(f'non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and cle in FRV and FRV[cle] != fr: d.append(f'{m} : {cle} déjà servie autrement')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        role = cle.split('.')[1] if cle else ''
        if cl == P and fr and role == 'bloc' and 'plural' not in fr:
            base = re.sub(r'\{(\w+)\}', r'\1', fr)
            if cle.split('.', 2)[2] != slug(base): d.append(f'{m} : {cle} ≠ slug « {slug(base)} »')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    open(os.path.join(ICI, '43-reputation-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㊲ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)))
    print('mots genrés ratifiés → liste de l’user (D14) :'); [print('   ', g) for g in GENRES]
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
