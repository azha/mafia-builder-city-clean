#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""56 — ㉜ la délégation : les mots que le client affiche HORS TABLE (écart de CLIENT-2 `1b45be42`, `Tools/juge-donnees/delegation/
ecart-2026-09-23.md`, questions (b), (d), (e), (f)), commande f2 du 23/09. ㉜ n'est pas ratifiée : D13 s'applique.
  1. `delegation.maitrise.*` — la sous-ligne de la plaque, dite par ce que le back SERT par charge (`GET /v1/meta/task-categories`,
     `meta-progression.projection.service.ts:59-79`) : la MAÎTRISE (`mastery_bucket` ∈ NASCENT · LEARNING · PRACTICED · ELIGIBLE,
     `mastery-bucket.ts:33` ; seule ELIGIBLE se confie, `graduation.service.ts:225`), `recovery`, `recall_scar`, et la charge tenue.
     ⚠️ MESURÉ : `recovery` = `player_proficiency.recovery_period_remaining > 0` (`:172`) — la période où la CHARGE se remet d'une reprise
     (`meta-progression-tunables.ts:263`, « realized at the recall tx »), PAS un lieutenant qui « rattrape » : le mot dit la charge.
     `recall_scar` = un événement de reprise existe pour cette charge (`hasRecallEvent`, `:174`). Le client affiche 9 phrases (4 de maîtrise,
     « vous rattrapez encore », « vous l'avez reprise » pour une charge à vous, « il la tient », « il rattrape encore », « repris une fois déjà »
     pour une charge confiée) : 7 clés, une par ÉTAT servi, le même mot que la charge soit à vous ou confiée ; les « il » sortent (D13) ;
     les participes s'accordent avec la CHARGE (« prête », « reprise », « tenue »), un nom, pas une personne.
  2. `delegation.charge_phrase.*` — les 4 charges au milieu d'une phrase (article, minuscule) : « Donnez-moi {charge} », « Reprendre
     {charge} », « Vous avez déjà confié {charge} » (question (d)). La famille servie `delegation.charge.*` garde ses titres.
  3. `delegation.replique.*` — la réplique du cadre 74, UNE par charge, chacune VRAIE pour sa charge (question (e)) : ce que le joueur ne fera
     plus, dit avec les mots SERVIS de la sous-ligne de la charge (`delegation.bloc.qui_livre_quoi_et_par_ou`…). « les commandes » ne vaut que
     pour SUPPLY_SOURCING. Le gabarit servi `delegation.bloc.donnez_moi_charge_…_les_commandes` reste servi (contrat additif), le client
     passe à la famille.
  4. le cadre 76 (question (f)) : SANS locuteur, la maison prévient, forme épicène — la clé servie est GARDÉE, seule la VALEUR change.
  5. v1.1 (f2, 24/09) : les libellés genrés de l'aperçu du 76 — « Ce qui a été appris », « Sa relève » (clés servies gardées), et la clé
     NEUVE `delegation.bloc.rancune` « Rancune » pour ㉜ seul (`reputation.etat.il_vous_en_veut` est à ㊲, ratifiée : elle ne bouge pas).
Clés : familles indexées par la valeur servie, en minuscules (`Libelle.ParValeur`). Contrôles (exit 1) : domaines couverts (maîtrise lue dans
`mastery-bucket.ts`, charges = les clés servies `delegation.charge.*`) ; aucune clé neuve déjà servie ; la clé du 76 servie ; D10 ; D13 ;
D17 (U+00A0 dans « » et avant « : », U+202F avant « ; ! ? ») ; paramètres fr = en ; somme-table code 0.
Usage : python3 Tools/atelier-2026-09-22/generer-56-delegation-maitrise.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
NB = ' '
def q(t): return f'«{NB}{t}{NB}»'
P, N = 'proposée', 'note'
CAD = '㉜'
LIGNES = [
 # 1. la maîtrise et les états de la charge (la sous-ligne de la plaque, cadres 73 et 75)
 ['vous apprenez encore', CAD + ' 73', P, 'delegation.maitrise.nascent', 'vous apprenez encore', 'you’re still learning', '`mastery_bucket` NASCENT ; le mot du client, gardé'],
 ['pas encore prête', CAD + ' 73', P, 'delegation.maitrise.learning', 'pas encore prête', 'not ready yet', 'LEARNING ; « prête » s’accorde avec la CHARGE'],
 ['presque prête', CAD + ' 73', P, 'delegation.maitrise.practiced', 'presque prête', 'almost ready', 'PRACTICED'],
 ['prête à confier', CAD + ' 73', P, 'delegation.maitrise.eligible', 'prête à confier', 'ready to hand over', 'ELIGIBLE : la seule qui se confie (`graduation.service.ts:225`)'],
 ['il rattrape encore', CAD + ' 75', P, 'delegation.maitrise.recovery', 'se remet encore', 'still recovering',
  '`recovery` = la CHARGE se remet d’une reprise (`recovery_period_remaining > 0`) — pas un lieutenant qui rattrape : le « il » (D13) et le sens sortent ; le même mot pour une charge à vous ou confiée'],
 ['vous rattrapez encore', CAD + ' 73', P, 'delegation.maitrise.recovery', '', '', 'même état servi, charge à vous : même clé'],
 ['repris une fois déjà', CAD + ' 75', P, 'delegation.maitrise.recall_scar', 'reprise une fois déjà', 'taken back once already',
  '`recall_scar` : la charge a déjà été reprise ; « reprise » s’accorde avec la CHARGE (le client écrivait « repris »)'],
 ['vous l’avez reprise', CAD + ' 73', P, 'delegation.maitrise.recall_scar', '', '', 'même état servi, charge à vous : même clé'],
 ['il la tient', CAD + ' 75', P, 'delegation.maitrise.tenue', 'tenue pour vous', 'held for you',
  'charge confiée, sans autre état ; le nom du tenant est déjà sur la plaque (roster) ; le « il » sort (D13)'],
 # 2. les charges au milieu d'une phrase
 ['(complément de famille)', '', P, 'delegation.charge_phrase.route_assignment', 'les tournées', 'deliveries', 'pour {charge} au milieu d’une phrase ; titre servi « Les tournées »'],
 ['(complément de famille)', '', P, 'delegation.charge_phrase.lieutenant_hiring', 'l’embauche', 'hiring', 'titre servi « L’embauche »'],
 ['(complément de famille)', '', P, 'delegation.charge_phrase.supply_sourcing', 'l’approvisionnement', 'supply', 'titre servi « L’approvisionnement »'],
 ['(complément de famille)', '', P, 'delegation.charge_phrase.heat_management', 'la chaleur', 'the heat', 'titre servi « La chaleur »'],
 # 3. la réplique du 74, une par charge
 ['« Donnez-moi les tournées. … les commandes. »', CAD + ' 74', P, 'delegation.replique.route_assignment',
  q('Donnez-moi les tournées. Je m’en occupe, et vous ne choisirez plus qui livre quoi.'), '“Give me the deliveries. I’ll handle it, and you won’t choose who delivers what any more.”',
  'ce que le joueur ne fera plus : la sous-ligne servie `delegation.bloc.qui_livre_quoi_et_par_ou`'],
 ['« Donnez-moi l’embauche. … les commandes. »', CAD + ' 74', P, 'delegation.replique.lieutenant_hiring',
  q('Donnez-moi l’embauche. Je m’en occupe, et vous ne choisirez plus qui entre dans la maison.'), '“Give me hiring. I’ll handle it, and you won’t choose who joins the house any more.”',
  'sous-ligne servie `delegation.bloc.qui_entre_dans_la_maison`'],
 ['« Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes. »', CAD + ' 74', P, 'delegation.replique.supply_sourcing',
  q('Donnez-moi l’approvisionnement. Je m’en occupe, et vous ne verrez plus passer les commandes.'), '“Give me supply. I’ll handle it, and you won’t see the orders go by any more.”',
  'la réplique de la maquette : VRAIE pour cette charge seule (`delegation.bloc.ce_qu_on_commande_et_a_qui`)'],
 ['« Donnez-moi la chaleur. … les commandes. »', CAD + ' 74', P, 'delegation.replique.heat_management',
  q('Donnez-moi la chaleur. Je m’en occupe, et vous ne déciderez plus quoi faire quand la ville s’échauffe.'),
  '“Give me the heat. I’ll handle it, and you won’t decide what we do when the city heats up any more.”',
  'sous-ligne servie `delegation.bloc.ce_qu_on_fait_quand_la_ville_s_echauffe`'],
 # 4. le cadre 76 : la maison prévient
 ['« Vous pouvez la reprendre. Il ne le prendra pas bien, et ce qu’il savait faire, vous devrez le réapprendre. »', CAD + ' 76', P,
  'delegation.bloc.vous_pouvez_la_reprendre_il_ne_le_prendra_pas_bien_et_ce_qu_il_savait_faire_vous_devrez_le_reapprendre',
  'Vous pouvez la reprendre. Ce sera mal pris, et tout ce qui s’y était appris, il faudra le réapprendre.',
  'You can take it back. It will be taken badly, and everything learned there will have to be learned again.',
  'SANS locuteur : la maison prévient (question (f)) ; D13 : « Il », « il savait » sortent — « il faudra » est impersonnel ; sans « » (plus de réplique) ; '
  'clé SERVIE gardée (contrat additif), seule la valeur change'],
 # 5. v1.1 (f2, 24/09) : les libellés GENRÉS de l'aperçu de reprise (cadre 76) — ㉜ non ratifiée, D13 (la 44 les envoyait à la liste de l'user, D14)
 ['Ce qu’il a appris', CAD + ' 76', P, 'delegation.bloc.ce_qu_il_a_appris', 'Ce qui a été appris', 'What was learned',
  'v1.1 : ligne `drop_bucket` ; D13 (« il » sort) ; clé SERVIE gardée, valeur changée'],
 ['Celui qu’il formait', CAD + ' 76', P, 'delegation.bloc.celui_qu_il_formait', 'Sa relève', 'Their successor',
  'v1.1 : ligne `suspended_successor_key` ; « sa » possessif épicène ; la valeur à côté reste « s’arrête aussi » ; clé SERVIE gardée'],
 ['Il vous en veut', CAD + ' 76', P, 'delegation.bloc.rancune', 'Rancune', 'Grudge',
  'v1.1 : clé NEUVE pour ㉜ seul — la clé servie `reputation.etat.il_vous_en_veut` est partagée avec ㊲, RATIFIÉE : elle ne bouge pas (f2) ; suivie de « pendant long » (`delegation.fenetre.*`)'],
 # 6. v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`)
 ['Quelqu\'un', CAD + ' 75', P, 'delegation.bloc.quelqu_un', 'Quelqu’un', 'Someone', 'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #14 : repli du nom quand le tenant n’est pas dans le roster ; épicène ; D10'],
 ['aucune n\'est encore prête', CAD + ' 73', P, 'delegation.bloc.aucune_n_est_encore_prete', 'aucune n’est encore prête', 'none is ready yet',
  'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #22 : précision du geste mort quand aucune charge n’est ELIGIBLE (dit AVANT l’appui : le 422 « not ELIGIBLE ») ; « prête » s’accorde avec la CHARGE'],
 ['Personne à qui la confier — la maison n\'a aucun lieutenant.', CAD + ' 74', P, 'delegation.bloc.personne_a_qui_la_confier_la_maison_n_a_aucun_lieutenant',
  'Personne à qui la confier — la maison n’a aucun lieutenant.', 'No one to hand it to — the house has no lieutenant.', 'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #30 : roster vide ; épicène ; D10'],
 ['aucun candidat', CAD + ' 74', P, 'delegation.bloc.aucun_lieutenant_disponible', 'aucun lieutenant disponible', 'no lieutenant available',
  'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #33 : D13 — « candidat » présume le genre d’une personne ; le NOM du rôle, « lieutenant » (déjà servi partout)'],
 ['On demande ce que ça coûterait…', CAD + ' 76', P, 'delegation.bloc.on_demande_ce_que_ca_couterait', 'On demande ce que ça coûterait…', 'Asking what it would cost…',
  'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #53 : l’aperçu de reprise en cours de chargement'],
 ['Le tableau de service n\'a pas répondu', CAD + ' (indisponible)', P, 'delegation.bloc.le_tableau_de_service_n_a_pas_repondu',
  'Le tableau de service n’a pas répondu', 'The duty roster didn’t answer', 'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #57 : état indisponible (hors maquette), tête ; D10'],
 ['On n\'a pas pu lire ce que vous tenez. Rien n\'a été changé.', CAD + ' (indisponible)', P, 'delegation.bloc.on_n_a_pas_pu_lire_ce_que_vous_tenez_rien_n_a_ete_change',
  'On n’a pas pu lire ce que vous tenez. Rien n’a été changé.', 'We couldn’t read what you hold. Nothing was changed.', 'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #58 : état indisponible, sous-titre ; D10'],
 ['Rien n’a été changé.', CAD, P, 'delegation.bloc.rien_n_a_ete_change', 'Rien n’a été changé.', 'Nothing was changed.',
  'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) #59 : repli d’un refus sans clé (clé déjà demandée par le client, non servie)'],
 ['Ce qu’on lui doit', CAD + ' 76', P, 'delegation.bloc.ce_qu_on_lui_doit', 'L’indemnité', 'Severance',
  'v1.2 (f2, 24/09 ; sites ∅ de la table lot 2 de CLIENT-2, `mafia-unity-F` `Tools/juge-donnees/delegation/table-lot2-2026-09-24.md`) : D13 (f2) — reformulé sans personne : « L’indemnité », qui lit sa valeur servie (`delegation.indemnite.*` : peu · une somme · cher · ruineux) ; clé SERVIE gardée, valeur changée'],
]
CLE_76 = LIGNES[-13][3]
GARDEES = {CLE_76, 'delegation.bloc.ce_qu_il_a_appris', 'delegation.bloc.celui_qu_il_formait', 'delegation.bloc.ce_qu_on_lui_doit'}   # clés SERVIES, valeur changée
D13 = re.compile(r"\b(il|ils|lui|homme|hommes)\b(?! faudra)", re.I)

def main():
    git = lambda c: subprocess.run(['git', '-C', BACK, 'show', f'HEAD:services/game-back/src/{c}'], capture_output=True, text=True, check=True).stdout
    st = git('i18n/string_table.ts')
    sha = subprocess.run(['git', '-C', BACK, 'rev-parse', '--short', 'HEAD'], capture_output=True, text=True).stdout.strip()
    def registre(nom):
        d = st.index(f'export const {nom}'); t = st[d:st.index('\n};', d)]
        return {m.group(1): re.sub(r'\\u([0-9a-fA-F]{4})', lambda x: chr(int(x.group(1), 16)), m.group(3)).replace("\\'", "'") for m in re.finditer(r"^\s*'([^'\s]+)':\s*\n?\s*(['\"])((?:[^'\"\\]|\\.)*)\2", t, re.M)}
    FR, EN = registre('FR_MESSAGES'), registre('EN_MESSAGES')
    depuis = []   # ⚖️ une clé de CETTE table servie depuis (le back a servi la 56, 66060cc1) est conforme si le back sert NOS mots (règle de la 37)
    maitrise = [x.lower() for x in re.findall(r"'([A-Z]+)'", re.search(r'type MasteryBucket\s*=([^;]*);', git('meta_progression/mastery-bucket.ts')).group(1))]
    charges = sorted(k.split('.')[-1] for k in FR if k.startswith('delegation.charge.'))
    d = []
    cles = {l[3] for l in LIGNES}
    for fam, dom in (('delegation.maitrise', maitrise), ('delegation.charge_phrase', charges), ('delegation.replique', charges)):
        have = sorted(k.split('.')[-1] for k in cles if k.startswith(fam + '.'))
        manque = sorted(set(dom) - set(have))
        if manque: d.append(f'{fam} : domaine non couvert {manque}')
    for l in LIGNES:
        m, _, cl, k, fr, en, note = l
        if k not in GARDEES and k in FR and fr:
            if FR[k] == fr: depuis.append(k)
            else: d.append(f'{k} : servie « {FR[k]} » ≠ la table « {fr} »')
        if k in GARDEES and k not in FR: d.append(f'{k} : annoncée servie, absente')
        if not fr: continue
        if "'" in fr + en: d.append(f'{k} : apostrophe droite (D10)')
        if D13.search(fr): d.append(f'{k} : forme genrée (D13)')
        if re.search(r'« |[^ ]»|[^ ]:|[^ ][;!?]', fr): d.append(f'{k} : D17')
        if sorted(re.findall(r'\{\w+\}', fr)) != sorted(re.findall(r'\{\w+\}', en)): d.append(f'{k} : paramètres fr ≠ en')
    if CLE_76 not in FR: d.append('la clé du 76 n’est plus servie')
    ecarts_gardees = [k for k in GARDEES if k in FR and FR[k] != next(l[4] for l in LIGNES if l[3] == k)]
    out = os.path.join(ICI, '56-delegation-maitrise-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note']) + '\n')
        for l in LIGNES: f.write('\t'.join(l) + '\n')
    comp = sum(1 for l in LIGNES if l[0].startswith('('))
    print(f'56 : back {sha} · somme = {len(LIGNES)} lignes = {len(LIGNES) - comp} mots + {comp} compléments · clés {len(cles)} '
          f'(maîtrise 7, charge_phrase 4, replique 4, 76 : 3 servies à valeur changée + 1 neuve, v1.1 ; v1.2 : 8 neuves + 1 servie à valeur changée) · servies depuis, conformes : {len(depuis)} · '
          f'clés gardées dont la valeur reste à changer au back : {len(ecarts_gardees)} · domaines : maîtrise {maitrise}, charges {charges}')
    rc = subprocess.run([sys.executable, os.path.join(ICI, 'somme-table.py'), out]).returncode
    if rc: d.append(f'somme-table code {rc}')
    for x in d: print('⛔', x)
    return 1 if d else 0

if __name__ == '__main__':
    sys.exit(main())
