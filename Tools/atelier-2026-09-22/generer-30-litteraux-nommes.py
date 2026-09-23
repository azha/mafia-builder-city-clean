#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La table de CLIENT-2 (`Tools/juge-donnees/i18n-litteraux-nommes-2026-09-23.tsv`, `14dffe6d`) complétée par l'atelier : l'EN des 103
clés, le FR des 5 littéraux anglais (éditeur de règles), le `’` partout (D10), et un signal quand un fr heurte un mot ratifié ou servi.
Sortie : `Tools/atelier-2026-09-22/30-litteraux-nommes-2026-09-23.tsv`, même format + une colonne « signal atelier ».
Le fr existant n'est PAS réécrit (commande f2) : les heurts sont SIGNALÉS, avec le mot en conflit ; seul le `’` est appliqué.
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
