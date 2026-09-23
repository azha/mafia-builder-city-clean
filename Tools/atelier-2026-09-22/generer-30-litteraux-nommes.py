#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La table de CLIENT-2 (`Tools/juge-donnees/i18n-litteraux-nommes-2026-09-23.tsv`, `14dffe6d`) complétée par l'atelier : l'EN des 103
clés, le FR des 5 littéraux anglais (éditeur de règles), le `’` partout (D10), et un signal quand un fr heurte un mot ratifié ou servi.
Sortie : `Tools/atelier-2026-09-22/30-litteraux-nommes-2026-09-23.tsv`, même format + une colonne « signal atelier ».
Le fr existant n'est PAS réécrit (commande f2) : les heurts sont SIGNALÉS, avec le mot en conflit ; seul le `’` est appliqué.
v2 (décisions f2 D12-D16 du 23/09, registre ARBITRAGES) : `30-litteraux-nommes-v2-2026-09-23.tsv`, même format + une colonne
« delta v1→v2 » ; la v1 est réécrite à l'identique (témoin).
Usage : python3 Tools/atelier-2026-09-22/generer-30-litteraux-nommes.py"""
import os, re, subprocess, unicodedata
ICI = os.path.dirname(os.path.abspath(__file__))
SRC = subprocess.run(['git', '-C', '/home/erutheone/project/mafia-builder-city-clean', 'show',
                      '14dffe6d:Tools/juge-donnees/i18n-litteraux-nommes-2026-09-23.tsv'], capture_output=True, text=True).stdout
def slug(s):
    o = ''
    for c in unicodedata.normalize('NFD', s):
        if unicodedata.category(c) == 'Mn': continue
        if c.isalnum(): o += c.lower()
        elif o and o[-1] != '_': o += '_'
    return o.strip('_')

EN = {  # (résolveur, valeur servie) → en
 ('TextePrix', 'UP'): 'the price is rising', ('TextePrix', 'STABLE'): 'the price is holding', ('TextePrix', 'DOWN'): 'the price is dropping',
 ('TexteStock', 'NONE'): 'nothing left',
 ('NomFamille', 'coil'): 'The Coil', ('NomFamille', 'tarcum'): 'Tarcum', ('NomFamille', 'iron_throat'): 'Iron Throat', ('NomFamille', 'saltline'): 'Saltline',
 ('SousTitreFamille', 'coil'): 'the scrap dealers of Spine', ('SousTitreFamille', 'tarcum'): 'the port, and what comes in',
 ('SousTitreFamille', 'iron_throat'): 'the north docks', ('SousTitreFamille', 'saltline'): 'the salt line, to the east',
 ('NomDeType', 'front_shop'): 'A shopfront', ('NomDeType', 'cash_safehouse'): 'A safehouse', ('NomDeType', 'stash'): 'A stash',
 ('NomDeType', 'lab'): 'A lab', ('NomDeType', 'grow_house'): 'a grow house', ('NomDeType', 'refinery'): 'A refinery',
 ('NomDeType', 'press_house'): 'A press', ('NomDeType', 'distribution_hub'): 'A distribution point', ('NomDeType', 'office'): 'An office',
 ('NomDeType', 'dealer_spot_front'): 'A dealer spot', ('NomDeType', 'money_holding'): 'A shell company', ('NomDeType', 'specialized_lab'): 'A specialized lab',
 ('NomTypeBatiment', 'distribution_hub'): 'the distribution depot', ('NomTypeBatiment', 'lab'): 'the lab', ('NomTypeBatiment', 'refinery'): 'the refinery',
 ('NomTypeBatiment', 'money_holding'): 'the vault', ('NomTypeBatiment', 'stash'): 'the safehouse', ('NomTypeBatiment', 'front_shop'): 'the shop',
 ('NomTypeBatiment', 'dealer_spot_front'): 'the counter', ('NomTypeBatiment', 'cash_safehouse'): 'the cash safehouse', ('NomTypeBatiment', 'grow_house'): 'the farm',
 ('TexteChemin', 'direct'): 'straight — the shortest', ('TexteChemin', 'meandering'): 'it winds — longer, quieter', ('TexteChemin', 'gnarled'): 'twisted — lots of detours',
 ('TexteTraverser', 'none'): 'no river', ('TexteTraverser', 'single'): 'one bridge', ('TexteTraverser', 'multiple'): 'three bridges',
 ('TexteRouteState', 'active'): 'holding',
 ('TexteTransitBand', 'ARRIVED'): 'arrived', ('TexteTransitBand', 'IDLE'): 'ready', ('TexteTransitBand', 'IN_TRANSIT'): 'on the way',
 ('TexteVehicule', 'FOOT'): 'on foot', ('TexteVehicule', 'BIKE'): 'by bike', ('TexteVehicule', 'CAR'): 'by car', ('TexteVehicule', 'REFRIGERATED_VAN'): 'by refrigerated van',
 ('Anciennete', 'FRESH'): 'New', ('Anciennete', 'ACCLIMATED'): 'Settled in', ('Anciennete', 'SEASONED'): 'Seasoned', ('Anciennete', 'SENIOR'): 'Veteran',
 ('Anciennete', 'ENTRENCHED'): 'Entrenched',
 ('TierLabelCourt', 'boutique'): 'boutique counsel', ('TierLabelCourt', 'corruption_pipeline'): 'corruption pipeline',
 ('Caisse', 'NONE'): 'EMPTY', ('Caisse', 'LOW'): 'LOW', ('Caisse', 'MODERATE'): 'PARTLY FULL', ('Caisse', 'HIGH'): 'FULL', ('Caisse', 'FULL'): 'OVERFLOWING',
 ('Marge', 'STANDARD'): 'AT THE RATE', ('Marge', 'ELEVATED'): 'ABOVE', ('Marge', 'PREMIUM'): 'PRICEY', ('Marge', 'HIGH_PREMIUM'): 'VERY PRICEY',
 ('Activite', 'WORKING'): 'ON SHIFT', ('Activite', 'IDLE'): 'IDLE', ('Activite', 'ABSENT'): 'AWAY', ('Activite', 'COMPROMISED'): 'BURNED',
 ('CroyanceMot', 'HUNTING'): 'They’re hunting you', ('CroyanceMot', 'SUSPICIOUS'): 'They’re suspicious', ('CroyanceMot', 'WATCHFUL'): 'They’re watching',
 ('CroyanceMot', 'DORMANT'): 'They’re asleep',
 ('PatrouilleMot', 'HIGH'): 'Everywhere', ('PatrouilleMot', 'MEDIUM'): 'Present', ('PatrouilleMot', 'LOW'): 'Sparse', ('PatrouilleMot', 'QUIET'): 'Nothing on the streets',
 ('?', 'north'): 'north', ('?', 'south'): 'south',
 ('EnLigne', 'tidewater'): 'the port', ('EnLigne', 'spine'): 'the avenue', ('EnLigne', 'lattice'): 'the grid', ('EnLigne', 'stack'): 'the chimneys',
 ('EnLigne', 'glass'): 'the towers', ('EnLigne', 'verge'): 'the outskirts',
 ('Valeur', 'tidewater'): 'Port', ('Valeur', 'spine'): 'Avenue', ('Valeur', 'lattice'): 'Grid', ('Valeur', 'stack'): 'Chimneys', ('Valeur', 'glass'): 'Towers',
 ('Valeur', 'verge'): 'Outskirts',
 ('ReserveLibelle', 'high'): 'HIGH', ('ReserveLibelle', 'standard'): 'NORMAL', ('ReserveLibelle', 'low'): 'LOW',
 ('Portee', 'minor'): 'minor', ('Portee', 'moderate'): 'moderate', ('Portee', 'major'): 'major',
 ('Urgence', 'low'): 'low', ('Urgence', 'elevated'): 'high', ('Urgence', 'pressing'): 'pressing',
 ('Label', 'DAWN'): 'Dawn', ('Label', 'DAY'): 'Day', ('Label', 'DUSK'): 'Evening', ('Label', 'NIGHT'): 'Night',
}
FR_REGLES = {  # les 5 littéraux ANGLAIS de l'éditeur de règles : l'en reste le littéral actuel, le fr est écrit ici
 ('ActionLabelFor', 'EXECUTE_DEFAULT'): 'Comme d’habitude', ('ActionLabelFor', 'PAUSE_OPS'): 'Suspendre',
 ('ConditionClause', 'same_building'): 'dans mon bâtiment',
 ('ActionWord', 'EXECUTE_DEFAULT'): 'faire comme d’habitude', ('ActionWord', 'PAUSE_OPS'): 'suspendre les opérations',
}
SIGNAL = {  # (résolveur, valeur) → heurt avec un mot ratifié ou servi (le fr n'est pas réécrit)
 ('NomTypeBatiment', 'distribution_hub'): 'heurte `building.type.distribution_hub` « Relais » (servi, et ① « Relais »)',
 ('NomTypeBatiment', 'stash'): '⚠️ « la planque » pour `stash`, alors que « Planque » est servi pour `cash_safehouse` (`building.type`) : deux types, un mot ; servi pour stash : « Réserve » (②) / « Cache » (①)',
 ('NomTypeBatiment', 'cash_safehouse'): 'heurte `building.type.cash_safehouse` « Planque » (servi) ; « la planque-coffre » n’existe nulle part ailleurs',
 ('NomTypeBatiment', 'front_shop'): 'heurte `building.type.front_shop` « Commerce-écran » (servi)',
 ('NomTypeBatiment', 'dealer_spot_front'): '⚠️ heurte `building.type.dealer_spot_front` « Coin de vente » ; et « le comptoir » est déjà le comptoir de ⑨ (`exceptions.bloc.le_comptoir_n_a_pas_repondu`)',
 ('NomTypeBatiment', 'grow_house'): 'heurte `building.type.grow_house` « Serre » (servi)',
 ('NomTypeBatiment', 'lab'): '« le labo » sert aussi `specialized_lab` (même mot pour deux types, `DistributionScreenController.cs:229-230`)',
 ('NomDeType', 'front_shop'): 'heurte `building.type.front_shop` « Commerce-écran »',
 ('NomDeType', 'stash'): '« Cache » = ① (`district.type_batiment.cache`) ; ② sert « Réserve » — un mot par type, ouvert (`22-…` §3.4)',
 ('NomDeType', 'grow_house'): 'minuscule, seul de la série (les 11 autres commencent par une capitale)',
 ('NomDeType', 'press_house'): 'heurte `building.type.press_house` « Imprimerie » (servi depuis `debee641`) ; « presse » = les journaux',
 ('NomDeType', 'distribution_hub'): 'heurte `building.type.distribution_hub` « Relais »',
 ('NomDeType', 'office'): 'heurte `building.type.office` « Agence » (servi) ; « Bureau » est l’écran ⑫',
 ('NomDeType', 'dealer_spot_front'): '« Point de vente » = ① ; ② sert « Coin de vente »',
 ('NomDeType', 'money_holding'): '⚠️ heurte d4 : `money_holding` = « la banque » (`e3e007cc`, servi « Banque ») ; « société-écran » n’est ce type nulle part',
 ('TexteTraverser', 'multiple'): '⚠️ « trois ponts » pour `multiple` : un NOMBRE que la donnée ne dit pas (plusieurs ≠ trois) — « plusieurs ponts »',
 ('TexteTransitBand', 'ARRIVED'): 'accord au masculin (le coursier) — un genre présumé ; « arrivé » / « prêt » : à dire sans accord si la règle vaut pour les coursiers',
 ('TexteTransitBand', 'IDLE'): 'idem « prêt »',
 ('Anciennete', 'FRESH'): 'mon `26-…` (⑦) proposait « nouveau venu » : je m’aligne sur « Récent », le mot déjà écrit par le client',
 ('Anciennete', 'ACCLIMATED'): '⚠️ « Acclimaté », « Aguerri », « Ancien », « Enraciné » s’accordent au masculin avec LE LIEUTENANT — un genre présumé (règle : aucun). Sans accord : l’accord avec « Ancienneté » (« récente · établie · solide · ancienne · enracinée ») ou des noms',
 ('Anciennete', 'SEASONED'): 'idem (genre présumé)', ('Anciennete', 'SENIOR'): 'idem (genre présumé)', ('Anciennete', 'ENTRENCHED'): 'idem (genre présumé)',
 ('Activite', 'WORKING'): 'la maquette ㉟ (série 6, cadres 107-112) dit « au travail »',
 ('Activite', 'IDLE'): 'la maquette ㉟ dit « au repos » ; et « INACTIF » s’accorde au masculin (le dealer)',
 ('Activite', 'ABSENT'): '« ABSENT » s’accorde au masculin (le dealer)',
 ('Activite', 'COMPROMISED'): 'la maquette ㉟ dit « grillé(s) » ; « COMPROMIS » s’accorde au masculin',
 ('CroyanceMot', 'HUNTING'): 'la maquette ⑰ (série 6, cadre 31) dit « EN CHASSE »',
 ('CroyanceMot', 'SUSPICIOUS'): 'la maquette ⑰ dit « SOUPÇON »',
 ('CroyanceMot', 'WATCHFUL'): 'la maquette ⑰ dit « EN VEILLE »',
 ('Label', 'DAWN'): '⚠️ la série 6 écrit « Matin » dans la barre (114 cadres) : aucune phase servie ne se dit « Matin » (DAWN « Aube », DAY « Plein jour ») — la maquette est en retard, ou il manque un mot',
 ('TexteStock', 'NONE'): 'le fr servi fait foi : « il n’y a plus rien » (’)',
}
lignes = SRC.rstrip('\n').split('\n'); tete = lignes[0].split('\t')
out = ['\t'.join(tete + ['signal atelier'])]
for l in lignes[1:]:
    c = l.split('\t'); c += [''] * (len(tete) - len(c))
    site, res, val, cle, fr, en, etat = c[:7]
    if (res, val) in FR_REGLES:
        en_actuel = c[5] or c[4]
        fr = FR_REGLES[(res, val)]; en = en_actuel; cle = f'famille.regle.{slug(fr)}'
    else:
        fr = fr.replace("'", '’'); en = EN[(res, val)]
    out.append('\t'.join([site, res, val, cle, fr, en, etat, SIGNAL.get((res, val), '')]))
dest = os.path.join(ICI, '30-litteraux-nommes-2026-09-23.tsv')
open(dest, 'w', encoding='utf-8').write('\n'.join(out) + '\n')
print(f'écrit : {dest} — {len(out) - 1} sites')

# ── v2 : décisions f2 D12-D16 du 23/09 (registre `ARBITRAGES-user-2026-09-07.md`) ──────────────────────────────────────────────────────────
# D12 un mot par type : le catalogue `building.type.*` (back `0714431c`) fait foi, l'article en dérive ; en = le mot en du catalogue.
# D13 épicène ; D14 la maquette ratifiée l'emporte (㉟ cadres 107-112, ⑰ cadres 31/34/35) ; D15 « plusieurs ponts » ; police.bloc validé.
V2 = {  # (résolveur, valeur) → (fr, en, delta)
 ('NomDeType', 'front_shop'): ('Un commerce-écran', 'A front shop', 'D12 catalogue « Commerce-écran »'),
 ('NomDeType', 'cash_safehouse'): ('Une planque', 'A cash safehouse', 'D12 (fr inchangé) ; en du catalogue'),
 ('NomDeType', 'stash'): ('Une réserve', 'A stash', 'D12 catalogue « Réserve »'),
 ('NomDeType', 'lab'): ('Un labo', 'A lab', 'D12 (inchangé)'),
 ('NomDeType', 'grow_house'): ('Une serre', 'A grow house', 'D12 majuscule comme les 11 autres'),
 ('NomDeType', 'refinery'): ('Une raffinerie', 'A refinery', 'D12 (inchangé)'),
 ('NomDeType', 'press_house'): ('Une imprimerie', 'A print shop', 'D12 catalogue « Imprimerie »'),
 ('NomDeType', 'distribution_hub'): ('Un relais', 'A distribution hub', 'D12 catalogue « Relais »'),
 ('NomDeType', 'office'): ('Une agence', 'An agency', 'D12 catalogue « Agence »'),
 ('NomDeType', 'dealer_spot_front'): ('Un coin de vente', 'A dealer-spot front', 'D12 catalogue « Coin de vente »'),
 ('NomDeType', 'money_holding'): ('Une banque', 'A vault', 'D12 « société-écran » retiré : `money_holding` = la banque'),
 ('NomDeType', 'specialized_lab'): ('Un labo spécialisé', 'A specialized lab', 'D12 (inchangé)'),
 ('NomTypeBatiment', 'distribution_hub'): ('le relais', 'the distribution hub', 'D12 catalogue « Relais »'),
 ('NomTypeBatiment', 'lab'): ('le labo', 'the lab', 'D12 : ne sert plus que `lab` (le `case "specialized_lab"` de la l.229 reçoit sa ligne)'),
 ('NomTypeBatiment', 'refinery'): ('la raffinerie', 'the refinery', 'D12 (inchangé)'),
 ('NomTypeBatiment', 'money_holding'): ('la banque', 'the vault', 'D12 (inchangé)'),
 ('NomTypeBatiment', 'stash'): ('la réserve', 'the stash', 'D12 catalogue « Réserve » (« la planque » = `cash_safehouse`)'),
 ('NomTypeBatiment', 'front_shop'): ('le commerce-écran', 'the front shop', 'D12 catalogue « Commerce-écran »'),
 ('NomTypeBatiment', 'dealer_spot_front'): ('le coin de vente', 'the dealer-spot front', 'D12 catalogue « Coin de vente » (≠ « le comptoir » de ⑨, ≠ « Planque »)'),
 ('NomTypeBatiment', 'cash_safehouse'): ('la planque', 'the cash safehouse', 'D12 catalogue « Planque » (« planque-coffre » retiré)'),
 ('NomTypeBatiment', 'grow_house'): ('la serre', 'the grow house', 'D12 catalogue « Serre »'),
 ('TexteTraverser', 'multiple'): ('plusieurs ponts', 'several bridges', 'D15'),
 ('TexteTransitBand', 'ARRIVED'): ('à destination', 'arrived', 'D13 épicène'),
 ('TexteTransitBand', 'IDLE'): ('disponible', 'ready', 'D13 épicène'),
 ('Anciennete', 'FRESH'): ('Depuis peu', 'New', 'D13 épicène (« Récent » et « nouveau venu » sortent)'),
 ('Anciennete', 'ACCLIMATED'): ('Depuis un moment', 'Settled in', 'D13 épicène'),
 ('Anciennete', 'SEASONED'): ('Du métier', 'Seasoned', 'D13 épicène'),
 ('Anciennete', 'SENIOR'): ('De la vieille garde', 'Veteran', 'D13 épicène'),
 ('Anciennete', 'ENTRENCHED'): ('Fait partie des murs', 'Entrenched', 'D13 épicène'),
 ('Activite', 'WORKING'): ('au travail', 'on shift', 'D14 ㉟ ratifiée (cadres 107-112), sa casse'),
 ('Activite', 'IDLE'): ('au repos', 'idle', 'D14 ㉟ ratifiée ; épicène (D13)'),
 ('Activite', 'ABSENT'): ('pas là', 'away', 'D14 ㉟ ratifiée (cadre 107, Dov) ; épicène (D13)'),
 ('Activite', 'COMPROMISED'): ('grillé', 'burned', 'D14 ㉟ ratifiée (cadres 107, 110) — ⚠️ GENRÉ : à l’user, pas corrigé'),
 ('CroyanceMot', 'HUNTING'): ('EN CHASSE', 'HUNTING', 'D14 ⑰ ratifiée (cadres 31, 34, 35)'),
 ('CroyanceMot', 'SUSPICIOUS'): ('SOUPÇON', 'SUSPICIOUS', 'D14 ⑰ ratifiée (cadre 31)'),
 ('CroyanceMot', 'WATCHFUL'): ('EN VEILLE', 'WATCHFUL', 'D14 ⑰ ratifiée (cadre 31)'),
 ('CroyanceMot', 'DORMANT'): ('EN SOMMEIL', 'DORMANT', 'PROPOSÉ : ⑰ ne dessine pas DORMANT ; même grammaire que « EN VEILLE »'),
}
AJOUTS = {  # D12 : les types que `NomTypeBatiment` renvoie au repli ou confond — une ligne neuve, après la ligne du `lab`
 'lab': [('Assets/Scripts/Operational/Distribution/DistributionScreenController.cs:229', 'specialized_lab', 'le labo spécialisé', 'the specialized lab',
          'D12 AJOUT : aujourd’hui « le labo » (même mot que `lab`) ; catalogue « Labo spécialisé »'),
         ('Assets/Scripts/Operational/Distribution/DistributionScreenController.cs:238', 'press_house', 'l’imprimerie', 'the print shop',
          'D12 AJOUT : aujourd’hui le repli « le bâtiment » ; catalogue « Imprimerie » (site : une ligne neuve avant le `default`)'),
         ('Assets/Scripts/Operational/Distribution/DistributionScreenController.cs:238', 'office', 'l’agence', 'the agency',
          'D12 AJOUT : aujourd’hui le repli « le bâtiment » ; catalogue « Agence » (site : une ligne neuve avant le `default`)')],
}
DOMAINE = {'commissariat.bloc': 'police.bloc'}   # validé par f2 le 23/09
SIGNAL_V2 = {
 ('NomTypeBatiment', 'stash'): '« réserve » dit aussi la réserve de confiance (⑯, `ReserveLibelle`) : contexte distinct, le catalogue fait foi (D12)',
 ('NomDeType', 'stash'): '① sert encore `district.type_batiment.cache` « Cache » : à aligner au catalogue (D12, back)',
 ('NomDeType', 'dealer_spot_front'): '① sert encore `district.type_batiment.point_de_vente` « Point de vente » : à aligner (D12, back)',
 ('NomDeType', 'press_house'): '① sert encore `district.type_batiment.atelier_de_presse` « Atelier de presse » : à aligner (D12, back)',
 ('NomDeType', 'office'): '① sert encore `district.type_batiment.bureau` « Bureau » : à aligner (D12, back)',
 ('NomDeType', 'lab'): '① sert encore `district.type_batiment.laboratoire` « Laboratoire » : à aligner (D12, back)',
 ('NomDeType', 'specialized_lab'): '① sert encore `district.type_batiment.laboratoire_specialise` « Laboratoire spécialisé » : à aligner (D12, back)',
 ('Activite', 'COMPROMISED'): '⚠️ GENRÉ ratifié (D14) : « grillé » (㉟ 107, 110), « grillés » (compteur, 107-112), « personne de grillé » (113-116), « Un homme grillé » (114) — à l’user',
 ('Anciennete', 'FRESH'): '⑦ (`26-…`) passe de « nouveau venu » à « depuis peu »',
 ('CroyanceMot', 'DORMANT'): 'PROPOSÉ (non ratifié)',
}
v2 = [out[0] + '\tdelta v1→v2']
for l in out[1:]:
    c = l.split('\t'); site, res, val, cle, fr, en, etat, sig = c
    dom = '.'.join(cle.split('.')[:2]); delta = ''
    if (res, val) in V2:
        fr2, en2, delta = V2[(res, val)]
        if (fr2, en2) == (fr, en): delta = ''                      # décision confirmée, rien ne bouge
        fr, en = fr2, en2; sig = SIGNAL_V2.get((res, val), '')
    if dom in DOMAINE:
        dom = DOMAINE[dom]; delta = (delta + ' ; ' if delta else '') + f'domaine {cle.split(".")[0]}.bloc → {dom}'
    cle = f'{dom}.{slug(fr)}'
    v2.append('\t'.join([site, res, val, cle, fr, en, etat, sig, delta]))
    if res == 'NomTypeBatiment' and val in AJOUTS:
        for s_, v_, f_, e_, d_ in AJOUTS[val]:
            v2.append('\t'.join([s_, res, v_, f'{dom}.{slug(f_)}', f_, e_, 'non servie', '', d_]))
dest2 = os.path.join(ICI, '30-litteraux-nommes-v2-2026-09-23.tsv')
open(dest2, 'w', encoding='utf-8').write('\n'.join(v2) + '\n')
print(f'écrit : {dest2} — {len(v2) - 1} sites ({len(v2) - len(out)} ajoutés), {sum(1 for x in v2[1:] if x.split(chr(9))[8])} lignes avec delta')
