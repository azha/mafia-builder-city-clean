#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""53 — les RÉSERVOIRS COMPLETS de noms de la fiction (commande f2 du 23/09, après le 52) : 48 lieutenants, 18 dealers,
72 enseignes (6 × 12 types, en français), plus une ligne ABSENT pour les chefs rivaux et les précincts.

Cadre (registres, pas de question à l'user) :
- ruling user du 06/09 « sombre / napolitain / mafieux », ère 1B (fin 80s – début 90s) ⇒ option A du 52 ;
- GDD 02 : aucune personne réelle, aucun cartel/clan réel, pas de cliché italo-américain des années 1950 ;
- les noms CANON restent : Hara, Nestor, Salvatore (le canon prime sur le réservoir) ;
- surnoms « 'o … » : permis avec parcimonie, marqués proposés ;
- FORME SERVIE GARDÉE (`common/dealer-names.ts`, en-tête) : lieutenant = « Lt. {nom} » (un NOM), dealer = PRÉNOM seul —
  « la FORME du nom doit porter cette différence » ; les deux réservoirs sont DISJOINTS (garde du back). ⇒ Le 52 proposait
  des prénoms pour les lieutenants : corrigé ici, les 45 neufs sont des noms de famille ;
- les enseignes gardent la grammaire servie « {métier en français} {nom} » et les 7 enseignes SANS nom propre déjà servies.
Le back remplace les réservoirs pour les NOUVELLES lignes seulement (les noms stockés ne changent pas), avant les portraits du lot 6.

Sortie : 53-reservoirs-noms-2026-09-23.tsv. Contrôle intégré (exit 1 si défaut) :
comptes 48/18/72 (6 par type, 12 types = les clés servies de building-signs.ts), unicité, disjonction lieutenants/dealers,
aucun nom propre neuf repris d'un réservoir servi, liste d'exclusion de l'atelier (clans, figures publiques, fictions célèbres).
La revue ⊥ (agent frais : la liste + GDD 02 seulement) est consignée dans 53-table-de-noms-2026-09-23.md.
Usage : python3 Tools/atelier-2026-09-22/generer-53-reservoirs-noms.py"""
import os, re, subprocess, sys
ICI = os.path.dirname(os.path.abspath(__file__))
BACK = os.path.expanduser('~/project/mafia-back-suite')
def servi(chemin):
    return subprocess.run(['git', '-C', BACK, 'show', 'HEAD:services/game-back/src/' + chemin], capture_output=True, text=True, check=True).stdout
def tableaux(txt):  # le CONTENU des « [...] » seulement (les apostrophes des commentaires décalent un appariement global)
    return [re.findall(r"'([^'\n]+)'", arr) for arr in re.findall(r"\[([^\]]*)\]", txt)]

CANON = {'Hara': 'réservoir servi + clés d\'accueil (Lt. Hara) ; « Crédit Hara » sort des enseignes (réservoirs disjoints)', 'Salvatore': 'maquette ⑦ (front.md l. 1396)', 'Nestor': 'clé servie appro.bloc.nestor_… + maquette du labo'}
# 48 = 4 groupes de 12, servis dans l'ordre (le back sert le groupe suivant quand l'équipe dépasse le précédent, comme Sec → Estuaire)
LIEUTENANTS = [
    ['Hara', 'Salvatore', 'Nestor', 'Zotta', 'Improta', 'Astarita', 'Verrastro', 'Labanca', 'Setaro', 'Formisano', 'Sicignano', 'Tortorella'],
    ['Aurilia', 'Ambrosino', 'Caccavale', 'Guardascione', 'Zaccagnino', 'Tripaldi', 'Ciaramella', 'Zaccara', 'Iaccarino', 'Scaringella', 'Pellino', 'Robortella'],
    ['Maiello', 'Nardozza', 'Frascella', 'Palomba', 'Montanaro', 'Pignalosa', 'Punzo', 'Cillis', 'Telesca', 'Siniscalchi', 'Lagala', 'Verrusio'],
    ['Corbo', 'Conturso', 'Acampora', 'Gerardi', 'Brienza', 'Capuano', 'Lovallo', 'Restaino', 'Sileo', 'Sagliocco', 'Scarpato', 'Amatucci'],
]
# surnoms : parcimonie (6 sur 48), champ À PART — le nom servi reste « Lt. {nom} » (les puces n'ont pas la place)
SURNOMS = {'Verrastro': "'o Sartore", 'Caccavale': "'a Lampara", 'Nardozza': "'o Quaderno", 'Verrusio': "'o Silenzio",
           'Iaccarino': "'a Maestra", 'Scarpato': "'o Pescatore"}
# 18 = diminutifs de rue (nés entre 1965 et 1975) ; 8 féminins (aucun accord servi : D13)
DEALERS = ['Lello', 'Nando', 'Nella', 'Peppe', 'Nunziatina', 'Gigino', 'Marietta', 'Mimmo', 'Assuntina',
           'Tonino', 'Ciccillo', 'Lina', 'Enzuccio', 'Vicienzo', 'Brunella', 'Cettina', 'Nicolino', 'Nannina']
SERVIES_GARDEES = {'Laverie du Quai', 'Consigne de la Threnny', 'Remise du 3', 'Pépinière du Verre', 'Serres du Treillis',
                   'Café du Quai', 'Change du Verre'}   # servies SANS nom propre (« Crédit Hara » sort : Hara est un lieutenant)
# ⛔ DÉCISION f2 du 23/09 : AUCUN nom de famille commun entre lieutenants et enseignes — « Pressing Varne » + « Lt. Varne » ferait lire
#    au joueur un lien de propriété qui n'existe pas. Les enseignes tirent donc d'un stock À ELLES : des patronymes que nul lieutenant
#    ne porte, et des NOMS DE LIEU du port (sans personne, donc sans risque de personne réelle), jamais un nom de district
#    (« Messagerie du Pont — Pont-Gris » se lirait mal dans la forme servie « {enseigne} — {district}, îlot {bloc} »).
ENSEIGNES = {
    'front_shop':        ['Pressing du Marché', 'Tabac-Presse du Môle', 'Laverie du Quai', 'Photo Tatasciore', 'Serrurerie Cafasso', 'Cordonnerie de la Fontaine'],
    'cash_safehouse':    ['Garde-meubles Palumbi', 'Consigne de la Threnny', 'Box de l’Écluse', 'Entrepôt des Docks', 'Déménagements Iodice', 'Dépôt du Chantier'],
    'stash':             ['Cave Scurti', 'Réserve des Tanneurs', 'Remise du 3', 'Débarras Ventresca', 'Cellier du Levant', 'Grenier Ascolese'],
    'lab':               ['Mécanique de l’Arsenal', 'Ferblanterie Vetrano', 'Réparation des Forges', 'Soudure Cicconetti', 'Outillage de la Fonderie', 'Électricité Pelusi'],
    'grow_house':        ['Serres Taraschi', 'Jardinerie des Tilleuls', 'Pépinière du Verre', 'Fleurs Spadaccini', 'Serres du Treillis', 'Horticulture du Couchant'],
    'refinery':          ['Distillerie Cantagallo', 'Traitement de surface Carusi', 'Filtration de la Digue', 'Épuration de l’Estuaire', 'Traitement des eaux du Phare', 'Récupération Tagliamonte'],
    'press_house':       ['Imprimerie Trinchillo', 'Presse du Beffroi', 'Reprographie Vecchione', 'Sérigraphie Zampella', 'Étiquettes Zinno', 'Papeterie des Remparts'],
    'distribution_hub':  ['Transports Cimmaruta', 'Messagerie du Viaduc', 'Coursiers de la Corniche', 'Fret de la Criée', 'Livraisons des Pêcheurs', 'Colis du Square'],
    'office':            ['Cabinet Iezzi', 'Fiduciaire des Arcades', 'Agence Amitrano', 'Comptoir Allocca', 'Secrétariat Cinquegrana', 'Études Pollice'],
    'dealer_spot_front': ['Kiosque Giancola', 'Snack Vollono', 'Salle de jeux Sorvillo', 'Café du Quai', 'Billard Aliperta', 'Vidéo-club Marinucci'],
    'money_holding':     ['Change Russiello', 'Crédit du Port', 'Caisse Zurolo', 'Prêts Colasante', 'Épargne Rapino', 'Change du Verre'],
    'specialized_lab':   ['Laboratoire Fierro', 'Analyses Porzio', 'Chimie fine Chiacchio', 'Contrôle Manna', 'Mesures Colantonio', 'Optique Nastri'],
}
LIEU = re.compile(r".*\b(?:du|de la|de l’|des) ?(\w[\w-]*)$")        # « … des eaux du Phare » → « Phare » : un LIEU, pas une personne
PATRO = re.compile(r"((?:(?:Di|Della|De) )?[A-ZÀ-Ý][\wÀ-ÿ]+)$")     # « Cabinet Della Ragione » → « Della Ragione »
ABSENTS = [
    ('chef rival', '4 (Coil, Tarcum, Gorge-de-Fer, Saltline)', 'aucun nom, aucun visage, aucun caractère décrits (lot 6 l. 269) : à écrire avec le lot 6, visage et caractère d\'abord'),
    ('précinct', '6 (BPD, GDD 02)', 'aucun nom propre servi (entier) ; la table 51 propose `police.bloc.precinct_n` « Précinct {n} » — le numéro suffit, pas de réservoir'),
]
EXCLUS = {  # LISTE DE L'ATELIER (clans et figures connus de Campanie, personnalités, fictions célèbres) — la revue ⊥ la complète
    'Cutolo', 'Alfieri', 'Nuvoletta', 'Bardellino', 'Zaza', 'Giuliano', 'Licciardi', 'Contini', 'Mallardo', 'Lauro', 'Russo',
    'Sarno', 'Mazzarella', 'Moccia', 'Fabbrocino', 'Misso', 'Polverino', 'Iovine', 'Schiavone', 'Zagaria', 'Bidognetti', 'Gionta',
    'Alessandro', 'Cesarano', 'Vollaro', 'Aprea', 'Cuccaro', 'Rinaldi', 'Reale', 'Amato', 'Pagano', 'Birra', 'Iacomino', 'Ascione',
    'Papale', 'Belforte', 'Nuzzo', 'Maresca', 'Cozzolino', 'Esposito', 'Terracciano', 'Graziano', 'Gallo', 'Cava', 'Marino',
    'Abbinante', 'Abete', 'Prestieri', 'Formicola', 'Lubrano', 'Cacciapuoti', 'Cimmino', 'Pezzella', 'Riccio', 'Liccardo', 'Vitale',
    'Savastano', 'Conte', 'Marzio', 'Troncone', 'Soprano', 'Corleone', 'Moltisanti', 'Montana', 'Capone', 'Coppola',
    'Maradona', 'Ferlaino', 'Bassolino', 'Merola', 'Troisi', 'Filippo', 'Cuomo', 'Maio', 'Donnarumma', 'Sorrentino', 'Starace',
    'Schettino', 'Serpico', 'Cirillo', 'Chianese', 'Nappi', 'Apicella', 'Cacace', 'Gaeta', 'Rosetta', 'Carmela', 'Titti', 'Ragioniere',
    'Riina', 'Provenzano', 'Gravano', 'Bagarella', 'Brusca', 'Greco', 'Badalamenti', 'Graviano', 'Denaro', 'Pesce', 'Piromalli', 'Mancuso', 'Stefano', 'Pelle', 'Strangio', 'Accardo', 'Cotugno', 'Sepe', 'Luca', 'Montella', 'Nocerino', 'Panariello', 'Totò', 'Pupetta', 'Gomorra', 'Ferrigno', 'Somma', 'Arpaia', 'Trapanese', 'Tittina', 'Cascone', 'Cuccurullo', 'Vincenzina', 'Capasso', 'Sorvino', 'Graziella', 'Mennella', 'Terracciano',
    # vérification EN LIGNE du 24/09 (53-verification-en-ligne-2026-09-24.md) : retirés et candidats écartés — ne peuvent pas revenir
    'Amodio', 'Anzalone', 'Balzano', 'Barbato', 'Barile', 'Buonocore', 'Caiazza', 'Cennamo', 'Cerasoli', 'Cervone', 'Ciampa', 'Donadio', 'Fusco', 'Gargiulo', 'Grieco', 'Guarracino', 'Iannuzzi', 'Imparato', 'Lamorte', 'Lanzetta', 'Lattanzio', 'Lauria', 'Lauritano', 'Longobardi', 'Lopardo', 'Mascolo', 'Mastrangelo', 'Mauriello', 'Menna', 'Mincione', 'Minichini', 'Musella', 'Orefice', 'Pacilio', 'Padula', 'Palladino', 'Parlato', 'Perrella', 'Postiglione', 'Ragione', 'Ragosta', 'Rega', 'Rescigno', 'Sannino', 'Santaniello', 'Sarnataro', 'Sborgia', 'Scamardella', 'Scognamiglio', 'Sibilio', 'Sparano', 'Staiano', 'Summa', 'Tufano', 'Ummarino', 'Vanacore', 'Vignola', 'Vitiello', 'Zuccarini', 'Cafiero', 'Capuozzo', 'Iannone', 'Napolano', 'Napolitano', 'Bove', 'Pinuccio', 'Halles',
    'Carotenuto', 'Langella', 'Auriemma', 'Buonanno', 'Visone', 'Tammaro', 'Ninetta', 'Totonno', 'Varriale', 'Martino', 'Marzano', 'Salzano', 'Mele',
    'Fiorillo', 'Fiorello', 'Palma', 'Ponant', 'Nunziante', 'Marfella', 'Burma', 'Bassins', 'Spinelli', 'Scotti', 'Pisciotta'}

def main():
    pools = {c: {x for t in tableaux(servi(c)) for x in t} for c in (
        'operational/lieutenant/lieutenant-name-pool.ts', 'common/dealer-names.ts', 'operational/legal/lawyer-name-pool.ts', 'common/building-signs.ts')}
    enseignes_servies = pools['common/building-signs.ts']
    mots_servis = {m for v in pools.values() for x in v for m in re.findall(r"[A-ZÀ-Ý][\wÀ-ÿ'-]+", x)}
    types_servis = re.findall(r"^\s*(\w+):\s*\[", servi('common/building-signs.ts'), re.M)
    lts = [n for g in LIEUTENANTS for n in g]
    defauts = []
    if len(lts) != 48 or any(len(g) != 12 for g in LIEUTENANTS): defauts.append(f'lieutenants {len(lts)} (groupes {[len(g) for g in LIEUTENANTS]}) — attendu 48 = 4 × 12')
    if len(DEALERS) != 18: defauts.append(f'dealers {len(DEALERS)} — attendu 18')
    if sorted(ENSEIGNES) != sorted(types_servis): defauts.append(f'types {sorted(ENSEIGNES)} ≠ servis {sorted(types_servis)}')
    for t, v in ENSEIGNES.items():
        if len(v) != 6: defauts.append(f'{t} : {len(v)} enseignes — attendu 6')
    ens = [e for v in ENSEIGNES.values() for e in v]
    for nom, v in (('lieutenants', lts), ('dealers', DEALERS), ('enseignes', ens)):
        d = sorted({x for x in v if v.count(x) > 1})
        if d: defauts.append(f'{nom} : doublons {d}')
    if set(lts) & set(DEALERS): defauts.append(f'lieutenants ∩ dealers {sorted(set(lts) & set(DEALERS))}')
    if not set(CANON) <= set(lts): defauts.append(f'canon manquant {sorted(set(CANON) - set(lts))}')
    for k in SURNOMS:
        if k not in lts: defauts.append(f'surnom pour {k}, absent des lieutenants')
    for e in SERVIES_GARDEES:
        if e not in enseignes_servies: defauts.append(f'« {e} » marquée servie gardée, absente de building-signs.ts')
        if e not in ens: defauts.append(f'« {e} » servie gardée, absente des 72')
    districts = set(re.findall(r'nom:\s*\'([^\']+)\'', servi('citysim/world/district-names.ts'))) or set(re.findall(r"'([^'\n]+)'", servi('citysim/world/district-names.ts')))
    lieux, patros = [], []
    for e in ens:
        if e in SERVIES_GARDEES: continue
        m = LIEU.match(e)
        if m: lieux.append(m.group(1))
        else: patros.append(PATRO.search(e).group(1))
    communs = sorted({w for p in patros for w in p.split()} & set(lts))
    if communs: defauts.append(f'lieutenants ∩ enseignes (décision f2 : disjoints) : {communs}')
    for nom, v in (('lieux', lieux), ('patronymes d’enseigne', patros)):
        dd = sorted({x for x in v if v.count(x) > 1})
        if dd: defauts.append(f'{nom} en double : {dd}')
    for l in lieux:
        if any(l in d or d in l for d in districts): defauts.append(f'lieu « {l} » recoupe un district servi')
    for e in ens:
        if "'" in e: defauts.append(f'« {e} » : apostrophe droite (D10)')
    neufs = [n for n in lts if n not in CANON] + DEALERS + patros
    for n in neufs:
        for mot in re.findall(r"[A-ZÀ-Ý][\wÀ-ÿ'-]+", n):
            if mot in mots_servis: defauts.append(f'« {n} » reprend un réservoir servi ({mot})')
            if mot in EXCLUS: defauts.append(f'« {n} » est dans la liste d\'exclusion')
    for s in SURNOMS.values():
        if any(w.strip("'").capitalize() in EXCLUS for w in s.split()): defauts.append(f'surnom « {s} » dans la liste d\'exclusion')
    lignes = []
    for gi, g in enumerate(LIEUTENANTS, 1):
        for r, n in enumerate(g, 1):
            st = 'canon' if n in CANON else 'proposé'
            note = CANON.get(n, '') + (f' ; surnom proposé {SURNOMS[n]} (champ à part)' if n in SURNOMS else '')
            lignes.append(['lieutenant', f'groupe {gi}', str(r), n, f'Lt. {n}', st, note.strip(' ;')])
    for r, n in enumerate(DEALERS, 1):
        lignes.append(['dealer', '—', str(r), n, n, 'proposé', ''])
    for t, v in ENSEIGNES.items():
        for r, e in enumerate(v, 1):
            st = 'servie gardée' if e in SERVIES_GARDEES else 'proposé'
            lignes.append(['enseigne', t, str(r), e, f'{e} — {{district}}, îlot {{block}}', st, 'nom de lieu (aucune personne)' if LIEU.match(e) and e not in SERVIES_GARDEES else ''])
    for cat, n, note in ABSENTS:
        lignes.append([cat, '—', '—', '—', '—', 'absent', f'{n} : {note}'])
    par = {}
    for l in lignes: par[l[5]] = par.get(l[5], 0) + 1
    tete = ['catégorie', 'groupe', 'rang', 'nom', 'forme servie', 'statut', 'note']
    out = os.path.join(ICI, '53-reservoirs-noms-2026-09-23.tsv')
    with open(out, 'w', encoding='utf-8') as f:
        f.write('\t'.join(tete) + '\n')
        for l in lignes: f.write('\t'.join(l) + '\n')
    print(f'53 : enseignes = {len(SERVIES_GARDEES)} servies gardées + {len(patros)} à patronyme + {len(lieux)} à nom de lieu · lieutenants ∩ enseignes = {len(communs)} · districts servis lus {len(districts)}')
    print(f'53 : somme = {len(lignes)} lignes = 48 lieutenants + 18 dealers + 72 enseignes + 2 absents · par statut {par} · '
          f'noms neufs contrôlés {len(neufs)} · surnoms {len(SURNOMS)} · réservoirs servis lus {sum(len(v) for v in pools.values())} · exclusions {len(EXCLUS)}')
    if len(lignes) != 48 + 18 + 72 + 2: defauts.append(f'somme {len(lignes)} ≠ 140')
    for d in defauts: print('⛔', d)
    return 1 if defauts else 0

if __name__ == '__main__':
    sys.exit(main())
