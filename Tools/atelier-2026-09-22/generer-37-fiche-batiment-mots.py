#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""37 — ② la fiche bâtiment : les 83 mots sans clé servie de ses cadres série 6 (36-47, 92-94 ; balayage `34-…`), un par un, en quatre classes
(commande f2 du 23/09 ; base du prochain lot de CLIENT-2 sur ②) :
  servie              une clé déjà servie dit la même chose (la clé est citée ; elle doit exister au back HEAD)
  servie · D14        une clé servie dit la même chose, mais la maquette RATIFIÉE dit un autre mot : la VALEUR est à aligner, la clé reste
                      (contrat additif) — ratification : la serre (36-38) par l'user le 26/08 (`front.md` l.818) ; ② par délégation le 02/09 (l.22)
  proposée            une clé NEUVE, sous la forme que le client dérive déjà (`Cle(rôle, littéral)` → `building.<rôle>.<slug>`, `BuildingCardController`)
  note                pas un libellé : nom d'exemple, scalaire brut (R2.2), geste sans route, glyphe (D11), glose sans donnée
D12 à D17 appliquées aux fr proposés : un mot par type/précurseur (D12), aucun genre présumé (D13), la maquette ratifiée l'emporte (D14),
pas de nombre que la donnée ne dit pas (D15), `’` (D10) et l'espace insécable avant « : ; ! ? » et dans « » (D17).
Routes lues au back (pour « geste sans route ») : `POST /v1/operational/lab/:id/cook {refining_passes}`, `POST /v1/operational/precursors/order`,
`GET /v1/operational/lab/:id`, `GET …/storage/:id`, `POST|GET /v1/operational/appointment[/:id[/honor]]`, les deux routes de `grow.controller.ts`.
Sortie : `37-fiche-batiment-mots-2026-09-23.tsv` (mot · cadres · classe · clé · fr · en · note). Contrôles en fin de script.
Usage : python3 Tools/atelier-2026-09-22/generer-37-fiche-batiment-mots.py"""
import collections, os, re, subprocess, sys, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
NB, NNB = ' ', ' '
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')
def rep(t):   # une réplique de lieutenant : guillemets français à espaces insécables (D17)
    return f'«{NB}{t}{NB}»'

S, A, P, N = 'servie', 'servie · D14', 'proposée', 'note'
PLANT = 'nom de plant d’exemple (le générateur de plantes tire une graine) : aucune donnée servie ne nomme un plant — ne pas l’afficher'
LIEU = 'nom de lieu d’exemple : le lieu vient de `glass_venue_building_id`, son nom est l’enseigne servie (`game.fiction.building.name`)'
SANSROUTE = 'geste sans route (le fourneau, direction B « côte à côte », contemplatif : front.md l.874-876) — ne pas en faire un bouton'
T = {  # mot tel que balayé → (classe, clé, fr, en, note)
 'KESTREL 4': (N, '', '', '', PLANT), 'MARSH BLUE': (N, '', '', '', PLANT), 'PALE 9': (N, '', '', '', PLANT), 'HOLLOW 2': (N, '', '', '', PLANT),
 'TIDEWAY': (N, '', '', '', PLANT), 'GRAY ELM': (N, '', '', '', PLANT), 'ROOK 1': (N, '', '', '', PLANT), 'COLD SNAP': (N, '', '', '', PLANT),
 'BOUTURE': (A, 'building.grow_stage.early', 'Bouture', 'Cutting', 'servi « Début » → le mot ratifié de la serre (36-38)'),
 'CROISSANCE': (A, 'building.grow_stage.mid', 'Croissance', 'Growth', 'servi « Milieu »'),
 'FLORAISON': (A, 'building.grow_stage.late', 'Floraison', 'Flowering', 'servi « Fin »'),
 'RÉCOLTE': (A, 'building.grow_stage.done', 'Récolte', 'Harvest', 'servi « À récolter »'),
 'VIGOUREUSE': (A, 'building.husbandry.thriving', 'Vigoureuse', 'Vigorous', 'servi « Florissante » ; s’accorde à la plante, pas à une personne'),
 'CORRECTE': (A, 'building.husbandry.on_track', 'Correcte', 'Fair', 'servi « En bonne voie »'),
 'À SOIGNER': (A, 'building.husbandry.withered', 'À soigner', 'Needs care', 'servi « Flétrie »'),
 'le cuisinier · J14': (S, 'famille.archetype.cuisinier', 'Cuisinier', 'Cook',
   'composé : l’archétype servi, SANS article (D13 : « le cuisinier » présume un genre) ; « J14 » : EXEMPLE de maquette (point 19, tranché par f2 le 23/09) — ne s’affiche pas tant qu’aucun champ ne le porte'),
 '« J’ai tiré le dernier bidon cette nuit — l’étagère est vide. Sans pyralin, je ne rallume pas. »':
   (S, 'appro.bloc.nestor_l_etagere_est_vide_sans_pyralin_je_ne_rallume_pas', '', '',
    'même sens, servi plus court ; À TRANCHER (f2 fait mesurer au back) : « Nestor : » en dur — personnage fixe du canon (fiction légitime) ou `{nom}` manquant comme « Lt. Hara » ? ; « pyralin » hors du catalogue `building.precursor.*` — précurseur réel (il entre au catalogue, D12) ou mot de réplique à `{param}` ?'),
 'le feu': (P, 'building.row.le_feu', 'le feu', 'the fire', 'l’échelle `cook_stage_band` du pupitre (39-44)'),
 'l’étagère': (P, 'building.row.l_etagere', 'l’étagère', 'the shelf', 'l’échelle `stock_band` (le précurseur)'),
 'les caisses': (P, 'building.row.les_caisses', 'les caisses', 'the crates', 'l’échelle `product_band` (le produit)'),
 'COMMANDER DU PYRALIN': (P, 'building.action.commander_du_pyralin', 'Commander du pyralin', 'Order pyralin',
   '`POST /v1/operational/precursors/order` ; À TRANCHER (f2 fait mesurer au back) : « pyralin » n’est pas au catalogue (Racine verdoyante · Résine de lull · Lys de verre) — précurseur réel (D12) ou `{param}` ?'),
 'il en faut avant de rallumer': (P, 'building.bloc.il_en_faut_avant_de_rallumer', 'il en faut avant de rallumer', 'you need some before relighting', ''),
 '« L’étagère est refaite. Dites-moi combien de passes, et j’allume. »':
   (P, 'building.replique.l_etagere_est_refaite_dites_moi_combien_de_passes_et_j_allume', rep('L’étagère est refaite. Dites-moi combien de passes, et j’allume.'),
    '“The shelf is restocked. Tell me how many passes, and I’ll light it.”', 'réplique du lieutenant du labo (première personne : aucun genre)'),
 'Passes': (P, 'building.row.passes', 'Passes', 'Passes', '`refining_passes` (Ash) ; même clé que « PASSES » du fourneau'),
 'PASSES': (P, 'building.row.passes', 'Passes', 'Passes', 'doublon de « Passes » (casse de la maquette)'),
 'ALLUMER LE FEU': (P, 'building.action.allumer_le_feu', 'Allumer le feu', 'Light the fire', '`POST /v1/operational/lab/:id/cook {refining_passes}`'),
 'ça consomme un lot de lys de verre': (P, 'building.bloc.ca_consomme_un_lot_de_lys_de_verre', 'ça consomme un lot de lys de verre',
   'it uses one batch of glass lily', '« lys de verre » = `building.precursor.glass_lily` (D12)'),
 '« Ça monte comme il faut. Si j’ouvre maintenant, je perds tout. »':
   (P, 'building.replique.ca_monte_comme_il_faut_si_j_ouvre_maintenant_je_perds_tout', rep('Ça monte comme il faut. Si j’ouvre maintenant, je perds tout.'),
    '“It’s rising right. If I open it now, I lose everything.”', ''),
 'Rien à faire ici.': (P, 'building.bloc.rien_a_faire_ici', 'Rien à faire ici.', 'Nothing to do here.', ''),
 'Repassez quand ce sera tiré': (P, 'building.bloc.repassez_quand_ce_sera_tire', 'Repassez quand ce sera tiré', 'Come back when it’s done',
   'le refus 409 dit, pas codé (front.md l.886-888)'),
 '— et ne me lancez pas une deuxième cuve tant que celle-là tourne.':
   (P, 'building.replique.et_ne_me_lancez_pas_une_deuxieme_cuve_tant_que_celle_la_tourne', '— et ne me lancez pas une deuxième cuve tant que celle-là tourne.',
    '— and don’t start a second batch while this one’s running.', 'suite de la réplique ; le refus 409 dit'),
 '« Trois passes, comme demandé. C’est plus long, mais ça sort propre. »':
   (P, 'building.replique.passes_passes_comme_demande_c_est_plus_long_mais_ca_sort_propre',
    rep('{passes} passes, comme demandé. C’est plus long, mais ça sort propre.'),
    '“{passes} passes, as asked. It takes longer, but it comes out clean.”', 'D15 : « Trois » vient de `refining_passes` → `{passes}` ; la clé suit le slug du fr'),
 'Chaque passe rallonge la nuit.': (P, 'building.bloc.chaque_passe_rallonge_la_nuit', 'Chaque passe rallonge la nuit.', 'Each pass makes the night longer.', ''),
 'C’est vous qui avez choisi': (P, 'building.bloc.c_est_vous_qui_avez_choisi', 'C’est vous qui avez choisi', 'You chose this', ''),
 '— je tiens la cuve jusqu’au bout.': (P, 'building.replique.je_tiens_la_cuve_jusqu_au_bout', '— je tiens la cuve jusqu’au bout.', '— I’ll see the batch through.', ''),
 '« C’est tiré. Ça ne peut pas dormir ici — chaque nuit que ça reste, c’est une nuit de trop. »':
   (P, 'building.replique.c_est_tire_ca_ne_peut_pas_dormir_ici_chaque_nuit_que_ca_reste_c_est_une_nuit_de_trop',
    rep('C’est tiré. Ça ne peut pas dormir ici — chaque nuit que ça reste, c’est une nuit de trop.'),
    '“It’s done. It can’t sleep here — every night it stays is one night too many.”', ''),
 'FAIRE SORTIR LA MARCHANDISE': (P, 'building.action.faire_sortir_la_marchandise', 'Faire sortir la marchandise', 'Move the goods out',
   'le dispatch (aucune route de « collecte », front.md l.889-890) ; servi ailleurs : `autonomy.log.dispatch` « Expédier maintenant » (le journal d’autonomie) — D14 : le mot ratifié pour ②'),
 'vers les coursiers': (P, 'building.bloc.vers_les_coursiers', 'vers les coursiers', 'to the couriers', ''),
 'l’approvisionnement · J11': (P, 'famille.category.approvisionnement', 'Approvisionnement', 'Supply',
   'la catégorie déléguée `SUPPLY_SOURCING` n’a pas de mot servi (les 8 `famille.category.*` ne la comptent pas) ; « J11 » : EXEMPLE de maquette (point 19, tranché par f2) — ne s’affiche pas tant qu’aucun champ ne le porte'),
 '« L’approvisionnement, c’est moi maintenant — vous me l’avez confié. Je commande quand il faut. »':
   (P, 'building.replique.l_approvisionnement_c_est_moi_maintenant_vous_me_l_avez_confie_je_commande_quand_il_faut',
    rep('L’approvisionnement, c’est moi maintenant — vous me l’avez confié. Je commande quand il faut.'),
    '“Supply is my job now — you handed it to me. I order when it’s needed.”', 'le 5ᵉ état (`assertNotDelegated(SUPPLY_SOURCING)`, front.md l.891-893)'),
 'Vous ne passez plus les commandes vous-même.': (P, 'building.bloc.vous_ne_passez_plus_les_commandes_vous_meme', 'Vous ne passez plus les commandes vous-même.',
   'You no longer place orders yourself.', ''),
 'Reprendre la main se fait depuis la Famille': (P, 'building.bloc.reprendre_la_main_se_fait_depuis_la_famille_pas_depuis_le_labo',
   'Reprendre la main se fait depuis la Famille, pas depuis le labo.', 'Taking back control happens from the Family, not from the lab.',
   'une phrase en deux nœuds de la maquette (avec « , pas depuis le labo. ») : une clé'),
 ', pas depuis le labo.': (P, 'building.bloc.reprendre_la_main_se_fait_depuis_la_famille_pas_depuis_le_labo', '', '', 'fin de la phrase précédente : même clé'),
 'STOCK · FAIBLE': (P, 'building.row.stock + building.stock.low', 'Stock · Faible', 'Stock · Low',
   'deux clés : la ligne `building.row.stock` (« Stock ») et la bande `building.stock.low` (« Faible », mot ratifié du fourneau) — famille neuve, §compléments'),
 'MONTÉE EN TEMPÉRATURE': (P, 'building.cook_stage.mid', 'Montée', 'Rising', 'le fourneau dit l’état MID en long ; une bande = un mot (D8) : « Montée »'),
 'CHAÎNE DU FROID OK': (S, 'building.row.chaine_du_froid + building.temperature.optimal_cold', 'Chaîne du froid · Froide, idéale', 'Cold chain · Cold, ideal',
   'composé servi ; « OK » cède à la bande servie'),
 'MONTÉE': (P, 'building.cook_stage.mid', 'Montée', 'Rising', 'mot ratifié (47 : « DÉBUT · MONTÉE · AFFINAGE · PRÊT ») — famille neuve'),
 'AFFINAGE': (P, 'building.cook_stage.late', 'Affinage', 'Refining', 'mot ratifié (47)'),
 '4°': (N, '', '', '', 'scalaire brut (R2.2) : le cadran porte la bande servie `building.temperature.optimal_cold` (« Froide, idéale »)'),
 '12°': (N, '', '', '', 'scalaire brut (R2.2) : `building.temperature.warming` (« Se réchauffe »)'),
 'TOUILLER': (N, '', '', '', SANSROUTE), 'BAISSER LE FEU': (N, '', '', '', SANSROUTE),
 'TIRER LE PRODUIT': (N, '', '', '', SANSROUTE + ' ; aucune route de « collecte » : la sortie est « Faire sortir la marchandise »'),
 'UNE PASSE DE PLUS': (N, '', '', '', SANSROUTE + ' ; les passes se fixent à l’allumage (`POST …/cook {refining_passes}`)'),
 'STOCK · HAUT · PUR': (P, 'building.stock.high + building.purity.pure', 'Stock · Haut · Pure', 'Stock · High · Pure',
   '`building.stock.high` neuf (« Haut », ratifié) ; la pureté est servie « Pure » : D1 (bandes au féminin) contre « PUR » de la maquette'),
 'PURETÉ HAUTE': (S, 'building.row.purete + building.purity.pure', 'Pureté · Pure', 'Purity · Pure', '« haute » n’est pas une valeur servie de `purity_band` (D8)'),
 'TROIS PASSES TENUES': (P, 'building.bloc.passes_passes_tenues', '{passes} passes tenues', '{passes} passes held', 'D15 : le nombre vient de `refining_passes`'),
 'ÉTAGÈRE VIDÉE': (N, '', '', '', 'état de scène de la descente (47, direction B) : les données servies sont `raid_risk`, `seized_amount`, `structural` — à dire avec elles'),
 'FEU COUPÉ': (N, '', '', '', 'idem (la descente)'),
 'STOCK SAISI': (S, 'building.row.saisie + building.seized_amount.*', 'Saisie · {une petite prise …}', 'Seizure · {a small haul …}', 'la saisie est servie, avec sa bande'),
 'TOUT EST PARTI': (N, '', '', '', 'idem (la descente) : aucune donnée ne dit « tout » (D15) ; `seized_amount` dit la prise'),
 'Un rendez-vous est pris': (P, 'building.bloc.un_rendez_vous_est_pris', 'Un rendez-vous est pris', 'An appointment is set', 'titre de l’état `scheduled` (Ash, 92)'),
 'Un client du district du Verre vous attend.': (P, 'building.bloc.un_client_du_district_du_verre_vous_attend', 'Un client du district du Verre vous attend.',
   'A client from the Glass district is waiting for you.', '« le Verre » est le nom servi du district ; la clientèle d’Ash est celle du Verre (canon, front.md l.936-937)'),
 'RENDEZ-VOUS · DISTRICT DU VERRE': (S, 'building.row.rendez_vous', 'Rendez-vous · district du Verre', 'Appointment · Glass district',
   'composé : la ligne servie + le nom de fiction servi du district'),
 'Verrerie Kestrel': (N, '', '', '', LIEU), 'Salon Aldrich': (N, '', '', '', LIEU), 'Le Cintre': (N, '', '', '', LIEU),
 'A': (N, '', '', '', 'glyphe près de « GAIN » : D11 — le mot suffit, c’est la bande servie `building.payout.*`'),
 'pure · bon prix': (N, '', '', '', 'glose sans donnée : la pureté est servie (`building.purity.pure`), un PRIX ne l’est pas (R2.2) ; le gain réel est `payout_band` (`building.payout.*`)'),
 'cristalline · prix fort': (N, '', '', '', 'idem (`building.purity.crystalline`)'),
 'coupée · bas prix': (N, '', '', '', 'idem (`building.purity.cut`)'),
 'AFFINÉE': (P, 'building.row.affinee', 'Affinée', 'Refined', 'la ligne des passes de l’écrin d’Ash (92-94) ; s’accorde à la marchandise'),
 '1 passe': (P, 'building.bloc.passes_compte', '{passes, plural, =0 {pas du tout} one {# passe} other {# passes}}',
   '{passes, plural, =0 {not at all} one {# pass} other {# passes}}', 'ICU (le back cite ICU pour D10) ; couvre « 1 passe », « 3 passes », « pas du tout »'),
 '3 passes': (P, 'building.bloc.passes_compte', '', '', 'même clé que « 1 passe »'),
 'pas du tout': (P, 'building.bloc.passes_compte', '', '', 'même clé que « 1 passe » (=0)'),
 'L’ATELIER': (A, 'building.row.taille_du_labo', 'L’atelier', 'The workshop',
   'TRANCHÉ par f2 le 23/09 (D14) : « L’atelier » l’emporte sur le servi « Taille du labo » — la valeur change PARTOUT (écrin d’Ash et fiche du labo), la clé reste'),
 'de base': (A, 'building.lab_tier.basic', 'de base', 'basic', 'servi « Simple »'),
 'amélioré': (A, 'building.lab_tier.refined', 'amélioré', 'upgraded', 'servi « Affiné » ; s’accorde à l’atelier'),
 'au meilleur niveau': (A, 'building.lab_tier.master', 'au meilleur niveau', 'top level', 'servi « Maître »'),
 'Le rendez-vous est honoré': (P, 'building.bloc.le_rendez_vous_est_honore', 'Le rendez-vous est honoré', 'The appointment was kept', 'titre de `honored` (93)'),
 'La marchandise est partie, le client a payé.': (P, 'building.bloc.la_marchandise_est_partie_le_client_a_paye', 'La marchandise est partie, le client a payé.',
   'The goods are gone, the client has paid.', ''),
 'Le rendez-vous est passé': (P, 'building.bloc.le_rendez_vous_est_passe', 'Le rendez-vous est passé', 'The appointment has passed', 'titre de `expired` (94)'),
 'Personne n’y est allé. Il faudra en reprendre un.': (P, 'building.bloc.personne_n_y_est_alle_il_faudra_en_reprendre_un',
   'Personne n’y est allé. Il faudra en reprendre un.', 'Nobody went. You’ll need to set another.', '« personne » : pronom indéfini, aucun genre présumé'),
}
COMPLEMENTS = [  # les familles neuves complétées (valeurs que la maquette ne dessine pas, ou dessine ailleurs)
 ('building.cook_stage.idle', 'Éteint', 'Out', 'PROPOSÉ : aucun mot ratifié pour IDLE'),
 ('building.cook_stage.early', 'Début', 'Start', 'ratifié (47)'), ('building.cook_stage.done', 'Prêt', 'Ready', 'ratifié (47)'),
 ('building.stock.none', 'Vide', 'Empty', 'PROPOSÉ'), ('building.stock.medium', 'Moyen', 'Medium', 'PROPOSÉ'),
 ('building.row.stock', 'Stock', 'Stock', 'ratifié (45-46)'),
]
ORDRE = ['servie', 'servie · D14', 'proposée', 'note']

def main():
    tsv = subprocess.run(['cat', os.path.join(ICI, '34-balayage-mots-serie6-2026-09-23.tsv')], capture_output=True, text=True).stdout.split('\n')[1:]
    mots = collections.OrderedDict()
    for l in tsv:
        c = l.split('\t')
        if len(c) > 4 and c[2] == '②' and c[4] == 'sans source': mots.setdefault(c[3], []).append(c[1])
    st = subprocess.run(['git', '-C', os.path.expanduser('~/project/mafia-back-suite'), 'show', 'HEAD:services/game-back/src/i18n/string_table.ts'],
                        capture_output=True, text=True).stdout
    d = st.index('export const FR_MESSAGES'); FR = {m.group(1) for m in re.finditer(r"^\s*'([^'\s]+)':", st[d:st.index('\n};', d)], re.M)}
    defauts = []
    if set(mots) != set(T): defauts.append(f'mots non couverts : {sorted(set(mots) - set(T))} · en trop : {sorted(set(T) - set(mots))}')
    out = ['\t'.join(['mot', 'cadres', 'classe', 'clé', 'fr', 'en', 'note'])]; comptes = collections.Counter()
    for m, cadres in mots.items():
        cl, cle, fr, en, note = T[m]; comptes[cl] += 1
        ks = [x.strip() for x in cle.split('+') if x.strip()]
        for k in ks:
            if cl in (S, A) and not k.endswith('*') and k not in FR: defauts.append(f'{m} : {k} annoncée servie, absente du back')
        # une proposée composée peut porter une moitié servie (« Stock · Haut · Pure » : `building.purity.pure` est servie) — au moins une clé neuve
        if cl == P and ks and all(k in FR for k in ks): defauts.append(f'{m} : {cle} proposée, mais tout est déjà servi')
        if cl == P and len(ks) == 1 and ks[0] in FR: defauts.append(f'{m} : {ks[0]} proposée, mais déjà servie')
        if "'" in fr + en: defauts.append(f'{m} : apostrophe droite')
        if re.search(r' [:;!?»]|« ', fr): defauts.append(f'{m} : D17 (espace ordinaire)')
        if re.search(r'\b(le cuisinier|il est|prêt à)\b', fr): defauts.append(f'{m} : D13')
        # le slug ne vaut que pour les rôles dérivés du littéral (`Cle(rôle, lit)`) ; une bande (`Bande(famille, valeur)`) a la valeur servie pour clé
        if cl == P and fr and '+' not in cle and 'plural' not in fr and cle.split('.')[1] in ('row', 'bloc', 'replique', 'action'):
            base = re.sub(r'[«» ]', '', fr).replace('{passes}', 'passes')
            if cle.split('.', 2)[2] != slug(base): defauts.append(f'{m} : {cle} ≠ slug « {slug(base)} »')
        out.append('\t'.join([m, ','.join(sorted(set(cadres), key=int)), cl, cle, fr, en, note]))
    for cle, fr, en, note in COMPLEMENTS:
        out.append('\t'.join(['(complément de famille)', '', P, cle, fr, en, note]))
        if cle in FR: defauts.append(f'{cle} : complément déjà servi')
    open(os.path.join(ICI, '37-fiche-batiment-mots-2026-09-23.tsv'), 'w', encoding='utf-8').write('\n'.join(out) + '\n')
    print(f'{len(mots)} mots de ② · ' + ' · '.join(f'{c} {comptes[c]}' for c in ORDRE) + f' · + {len(COMPLEMENTS)} compléments de famille')
    [print('  ⛔', x) for x in defauts]; print(f'{len(defauts)} défaut(s)'); sys.exit(1 if defauts else 0)

if __name__ == '__main__':
    main()
