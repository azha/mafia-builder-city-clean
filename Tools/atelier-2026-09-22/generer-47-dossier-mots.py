#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""47 — ㊴ le dossier : les mots sans clé servie de ses cadres série 6 (131-136, 143 ; balayage `34-…`), même format que 37/40/43/44/46
(commande f2 du 23/09). Classes : servie · servie · D14 · proposée · note. D12-D18 ; gestes avec ou sans route. ㊴ ratifié par délégation.
Données servies (back `2aa0f93b`, lu) :
  `GET /v1/me/forensic` → `audit_risk_bucket` ∈ clean|watched|flagged|audited, `effluent_visibility_bucket` ∈ clear|faint|visible|glaring,
      `lifestyle_alarm_bucket` ∈ quiet|noticed|watched|subpoenaed (`forensic.projection.service.ts:14-16,79`) ;
  `GET /v1/me/internal-affairs/actors` → `{actorRef, actorType ∈ lawyer|clerk, status ∈ steady|nervous|unavailable|gone}` (`ia-projection.service.ts:77,109-111`) ;
  `POST /v1/me/internal-affairs/actors/:ref/intel {actor_type}` (acheter du renseignement, 5 types acceptés) ;
  au catalogue : `forensic.bloc.*`, `forensic.cran.un_dossier_est_ouvert`, `forensic.evenement.{ils_sont_venus, ca_saute_aux_yeux, convocation_recue}`,
      `forensic.gravite.*` (le client : rôles bloc · cran · evenement · gravite).
Règle de la maquette (143), reprise : le DERNIER cran de chaque piste est un ÉVÉNEMENT (`forensic.evenement.*`), les autres des CRANS (`forensic.cran.*`).
⚠️ D13/D14 : le ratifié « convoqué » (subpoenaed) est genré ; le servi « Convocation reçue » est épicène : on GARDE le servi, « convoqué » va à la
   liste de l'user. Idem « il tient », « il a peur », « parti », « Celui-là ne reviendra pas » (acteurs).
Sortie : `47-dossier-mots-2026-09-23.tsv` (+ la somme : `somme-table.py`). Usage : python3 Tools/atelier-2026-09-22/generer-47-dossier-mots.py"""
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
def b(fr, en, note='', role='bloc'): return (P, f'forensic.{role}.' + slug(re.sub(r'\{(\w+)\}', r'\1', fr)), fr, en, note)
BRUT = 'identifiant brut montré EXPRÈS dans le cadre témoin (143, « aucune valeur servie sans dessin ») — pas un libellé'
DA = 'explication de DA dans le téléphone (pourquoi trois colonnes / tous les crans) — pas un libellé'
LOT = 'panneau des lots (136) — pas un libellé'
T = {
 'trois pistes, et elles ne se mélangent pas': b('trois pistes, et elles ne se mélangent pas', 'three tracks, and they don’t mix', 'sous-titre (131)'),
 'pistes chaudes': b('pistes chaudes', 'hot tracks', 'le compte des pistes au-dessus du premier cran (dérivé des 3 bandes)'),
 'franchies': b('franchies', 'crossed', 'le compte des pistes au dernier cran (un événement)'),
 'qui tiennent': b('qui tiennent', 'holding', 'le compte des acteurs `steady` (« /4 »)'),
 'on regarde': b('on regarde', 'they’re watching', '`audit_risk_bucket` = watched', 'cran'),
 'watched': (N, '', '', '', BRUT), 'ce qui sort des cuves': b('ce qui sort des cuves', 'what comes out of the vats', 'sous-titre de la piste `effluent` (le titre servi : `forensic.bloc.visibilite_des_rejets`)'),
 'visible': (N, '', '', '', BRUT + ' (et la valeur `visible` → « ça se voit », `forensic.cran.ca_se_voit`)'),
 'le train de vie d’un lieutenant': b('le train de vie d’un lieutenant', 'a lieutenant’s lifestyle', 'sous-titre de la piste `lifestyle` (titre servi : `forensic.bloc.train_de_vie`)'),
 'discret': b('discret', 'low-key', '`lifestyle_alarm_bucket` = quiet ; s’accorde au train de vie', 'cran'),
 'quiet': (N, '', '', '', BRUT),
 'pourquoi trois colonnes': (N, '', '', '', DA), 'On peut être propre sur deux et pris sur la troisième': (N, '', '', '', DA),
 'la comptabilité, les rejets et le train de vie sont': (N, '', '', '', DA), 'suivis séparément': (N, '', '', '', DA),
 '. Les moyenner effacerait la seule chose utile :': (N, '', '', '', DA), 'par où ça fuit': (N, '', '', '', DA),
 'ACHETER DU RENSEIGNEMENT': b('Acheter du renseignement', 'Buy intelligence', 'geste À ROUTE (`POST /v1/me/internal-affairs/actors/:ref/intel`)'),
 'sur un acteur, pas sur une piste —': b('sur un acteur, pas sur une piste — on n’achète pas un dossier', 'on an actor, not a track — you don’t buy a file', 'une phrase en deux nœuds'),
 'on n’achète pas un dossier': (P, 'forensic.bloc.sur_un_acteur_pas_sur_une_piste_on_n_achete_pas_un_dossier', '', '', 'même phrase'),
 'audited': (N, '', '', '', BRUT), 'convoqué': (S, 'forensic.evenement.convocation_recue', '', '',
   '`subpoenaed` : le servi « Convocation reçue » est épicène ; le ratifié « convoqué » est GENRÉ → gardé le servi, « convoqué » à la liste de l’user (D13/D14)'),
 'subpoenaed': (N, '', '', '', BRUT),
 'le dernier cran': (N, '', '', '', DA + ' (132)'), 'Ce n’est plus une surveillance': (N, '', '', '', DA + ' (132)'),
 '« ils sont venus » et « convoqué » ne sont pas des crans de plus :': (N, '', '', '', DA + ' (132)'), 'quelque chose a eu lieu': (N, '', '', '', DA + ' (132)'),
 '. Deux pistes sur trois ont franchi.': (N, '', '', '', DA + ' (132)'),
 'qui parle, et qui a peur': b('qui parle, et qui a peur', 'who talks, and who’s scared', 'sous-titre (133) : les acteurs'),
 'acteurs connus': b('acteurs connus', 'known actors', 'le compte de `actors[]`'),
 'qui ont peur': b('qui ont peur', 'scared', 'le compte des `nervous`'),
 'partis': b('partis', 'gone', 'le compte des `gone` ; ⚠️ D14 : accord masculin (« partis ») → liste de l’user'),
 'Avocat': (P, 'forensic.acteur.lawyer', 'Avocat', 'Lawyer', '`actorType` = lawyer (ratifié) ; ⚠️ nom de métier au masculin → liste de l’user (D13)'),
 'il tient': (P, 'forensic.statut.steady', 'il tient', 'holding', '`status` = steady (ratifié) ; ⚠️ D14 : « il » genré → liste de l’user'),
 'Greffier': (P, 'forensic.acteur.clerk', 'Greffier', 'Clerk', '`actorType` = clerk (ratifié) ; ⚠️ masculin → liste de l’user'),
 'il a peur': (P, 'forensic.statut.nervous', 'il a peur', 'scared', '= nervous (ratifié) ; ⚠️ « il » genré'),
 'injoignable': (P, 'forensic.statut.unavailable', 'injoignable', 'unreachable', '= unavailable (ratifié ; épicène)'),
 'parti': (P, 'forensic.statut.gone', 'parti', 'gone', '= gone (ratifié) ; ⚠️ genré → liste de l’user'),
 'deux types listés, cinq achetables': (N, '', '', '', LOT + ' (L1, 133)'), 'Trois acteurs que rien ne vous montre': (N, '', '', '', LOT + ' (L1)'),
 'la route accepte d’acheter du renseignement sur': (N, '', '', '', LOT + ' (L1)'), 'cinq types': (N, '', '', '', LOT + ' (L1)'),
 '— l’inspecteur du port, le courtier, le greffier du juge — mais la liste n’en rend que': (N, '', '', '', LOT + ' (L1)'),
 '. Les trois autres existent sans être visibles.': (N, '', '', '', LOT + ' (L1)'),
 'il ne reviendra pas': b('il ne reviendra pas', 'they won’t be back', 'sous-titre (134) ; ⚠️ D14 : « il » genré'),
 'parti n’est pas injoignable': (N, '', '', '', DA + ' (134)'),
 'Celui-là ne reviendra pas': b('Celui-là ne reviendra pas', 'That one won’t be back', '⚠️ D14 : « Celui-là » genré'),
 'un acteur': (N, '', '', '', DA + ' (134)'), 'revient. Un acteur': (N, '', '', '', DA + ' (134)'),
 'est une perte définitive — la seule chose à en faire est de ne plus compter dessus.': (N, '', '', '', DA + ' (134)'),
 'rien à votre nom': (P, 'forensic.bloc.rien_a_votre_nom', '', '', 'sous-titre de l’état vide (135) : les MÊMES mots que le titre (la casse est un style) — même clé, une seule valeur (repéré par `somme-table.py`)'),
 'Rien à votre nom.': b('Rien à votre nom.', 'Nothing in your name.', 'titre (135)'),
 'Personne n’a encore eu de raison de vous ouvrir un dossier.': b('Personne n’a encore eu de raison de vous ouvrir un dossier.', 'Nobody has had a reason to open a file on you yet.', ''),
 'ce n’est pas une bonne nouvelle': b('ce n’est pas une bonne nouvelle', 'it isn’t good news', ''),
 'C’est juste une nouvelle': b('C’est juste une nouvelle', 'It’s just news', ''),
 'les trois pistes montent avec ce que vous faites. À zéro, elles ne disent pas que vous êtes prudent : elles disent que':
   b(f'les trois pistes montent avec ce que vous faites. À zéro, elles ne disent pas que vous êtes prudent{NB}: elles disent que vous n’avez pas encore commencé.',
     'the three tracks rise with what you do. At zero, they don’t say you’re careful: they say you haven’t started yet.',
     'une phrase en deux nœuds ; D17 ; ⚠️ « prudent » s’accorde au joueur → liste de l’user (D13)'),
 'vous n’avez pas encore commencé': (P, 'forensic.bloc.les_trois_pistes_montent_avec_ce_que_vous_faites_a_zero_elles_ne_disent_pas_que_vous_etes_prudent_elles_disent_que_vous_n_avez_pas_encore_commence', '', '', 'même phrase'),
 'acteurs': (N, '', '', '', LOT), 'L1': (N, '', '', '', LOT), 'Lister les cinq types d’acteurs': (N, '', '', '', LOT),
 'la route en achète cinq, la projection en rend deux — trois sont hors de vue': (N, '', '', '', LOT), 'L2': (N, '', '', '', LOT),
 'Donner un nom aux acteurs': (N, '', '', '', LOT), '`actorRef` est un identifiant ; sixième écran à buter sur les libellés manquants': (N, '', '', '', LOT),
 'L3': (N, '', '', '', LOT), 'Dire le prix du renseignement': (N, '', '', '', LOT), 'on achète sans savoir combien ; aucun champ ne le porte': (N, '', '', '', LOT),
 'L4': (N, '', '', '', LOT), 'Dire ce que le renseignement a donné': (N, '', '', '', LOT), 'la route retourne un résultat qu’aucune lecture ne conserve': (N, '', '', '', LOT),
 'les douze crans, tous': (N, '', '', '', 'sous-titre du cadre TÉMOIN (143) — pas un écran du joueur'),
 'pistes': b('pistes', 'tracks', 'compteur (143) ; même mot que 131'), 'crans': (N, '', '', '', 'compteur du cadre témoin'), 'moyennés': (N, '', '', '', 'compteur du cadre témoin'),
 'clean': (N, '', '', '', BRUT), 'flagged': (N, '', '', '', BRUT), 'clear': (N, '', '', '', BRUT), 'faint': (N, '', '', '', BRUT), 'glaring': (N, '', '', '', BRUT),
 'noticed': (N, '', '', '', BRUT),
 'invisible': b('invisible', 'unseen', '`effluent_visibility_bucket` = clear', 'cran'),
 'des traces': b('des traces', 'traces', '= faint', 'cran'),
 'remarqué': b('remarqué', 'noticed', '`lifestyle_alarm_bucket` = noticed ; s’accorde au train de vie', 'cran'),
 'suivi': b('suivi', 'followed', '= watched ; s’accorde au train de vie', 'cran'),
 'pourquoi tous les crans': (N, '', '', '', DA), 'Le dernier de chaque piste est un événement, pas un cran de plus': (N, '', '', '', DA),
 'ils sont venus · ça saute aux yeux · convoqué — on ne vous surveille plus. L’écran les montre': (N, '', '', '', DA), 'tous': (N, '', '', '', DA),
 'pour qu’aucune valeur servie ne soit sans dessin.': (N, '', '', '', DA),
}
COMPLEMENTS = [
 ('forensic.cran.rien_a_signaler', 'rien à signaler', 'nothing to report', '`audit_risk_bucket` = clean (ratifié 143 ; le mot est servi ailleurs : `accueil.carte.rien_a_signaler`)'),
 ('forensic.cran.ca_se_voit', 'ça se voit', 'it shows', '`effluent_visibility_bucket` = visible (ratifié 131, 143)'),
]
GENRES = ['« convoqué » (143 ; le servi épicène « Convocation reçue » est gardé)', '« il tient », « il a peur », « parti », « partis » (133)', '« Avocat », « Greffier » (noms de métier)',
          '« il ne reviendra pas », « Celui-là ne reviendra pas » (134)', '« vous êtes prudent » (135 — le joueur)']

def main():
    tsv = open(os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv'), encoding='utf-8').read().split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '㊴' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d0 = st.index('export const FR_MESSAGES')
    FRV = {m.group(1): m.group(2).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*'((?:[^'\\]|\\.)*)'", st[d0:st.index('\n};', d0)], re.M)}
    d, out, comptes = [], ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])], collections.Counter()
    if set(mots) != set(T): d.append(f'non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        if cl in (S, A) and cle not in FRV: d.append(f'{m} : {cle} annoncée servie, absente')
        if cl == P and fr and cle in FRV and FRV[cle] != fr: d.append(f'{m} : {cle} servie avec d’autres mots')
        if "'" in fr + en: d.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): d.append(f'{m} : D17')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMPLEMENTS:
        if cle in FRV and FRV[cle] != fr: d.append(f'{cle} : complément servi avec d’autres mots')
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
    open(os.path.join(ICI, '47-dossier-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ㊴ · ' + ' · '.join(f'{c} {comptes[c]}' for c in (S, A, P, N)) + f' · + {len(COMPLEMENTS)} compléments')
    print('mots genrés → liste de l’user (D14) :'); [print('   ', g) for g in GENRES]
    [print('  ⛔', x) for x in d]; print(f'{len(d)} défaut(s)'); sys.exit(1 if d else 0)

if __name__ == '__main__':
    main()
