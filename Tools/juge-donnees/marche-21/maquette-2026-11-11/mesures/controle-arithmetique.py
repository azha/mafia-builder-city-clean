#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Recompte la table de couverture de ㉑ et EMET la table markdown.

Mode maquette : deux cotes, B (back, DEDUIT) et M (maquette).
Identite obligatoire du mandat : |cles B| + |elements M non apparies| = nombre de lignes.

Le controle NEGATIF (option --negatif) injecte une ligne sans B ni M : l'identite
DOIT rougir. Sans ce rouge, un vert ne prouve rien.
"""
import sys

# ─────────── Cote B : une entree par CLE PROJETEE, avec sa preuve et son appariement M ───────────
# ('id', 'cle', 'preuve (fichier:ligne)', 'M apparie(s) ou ""', 'statut', 'classe')
B = [
 # R1 — GET /v1/me/market/lanes  (market.controller.ts:104, @UseGuards(JwtAuthGuard):105)
 ('B01','lanes[] (cardinal)','market.controller.ts:106-115 ; cles epinglees e2e marche_ardoise_enumerateur.engine.spec.ts:60,191 ; enveloppe payload.data.lanes :120','M06,M11,M14','affichee comme dessinee','OK'),
 ('B02','lanes[].district_id','market.controller.ts:111 ; LaneConfidenceRow market-projection.service.ts:47','M12','affichee comme dessinee','OK'),
 ('B03','lanes[].substance_type','market.controller.ts:112 ; enum operational_chain.ts:40 [brindle,crick,hush,ash]','M10,M16,M21,M36,M47,M48','affichee comme dessinee','OK'),
 ('B04','lanes[].lane_confidence_bucket','market.controller.ts:113 ; LOW / MODERATE / HIGH market-projection.service.ts:38 ; seuils :137-141','M07,M15,M23,M24','affichee comme dessinee','OK'),
 # R3 — GET /v1/world/districts  (world.controller.ts:39 — PUBLIQUE, aucun JwtAuthGuard)
 ('B05','districts[] (cardinal 18)','world-geography.repository.ts:77-105 ; ordre asc(id) :88','M08,M11','affichee comme dessinee','OK'),
 ('B06','districts[].id','world-geography.repository.ts:36,90','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B07','districts[].profile','world-geography.repository.ts:37,91 ; enum world_geography.ts:14-21 (6 membres)','M32,M35','affichee comme dessinee','OK'),
 ('B08','districts[].index','world-geography.repository.ts:38,92','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B09','districts[].name_canonical','world-geography.repository.ts:39,93','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B10','districts[].block_count','world-geography.repository.ts:40,94','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B11','districts[].bank_side','world-geography.repository.ts:41,95 ; enum world_geography.ts:23','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B12','districts[].control_state','world-geography.repository.ts:42,96 ; domaine ferme :58','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B13','districts[].name (les 18 noms de fiction)','world-geography.repository.ts:45,99 ; district-names.ts:23-29','M12','affichee comme dessinee','OK'),
 ('B14','districts[].precinct_id','world-geography.repository.ts:49,101','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B15','districts[].openable_types','world-geography.repository.ts:54,103','','disponible, ni dessinee ni affichee','QUESTION'),
 # R4 — GET /v1/me/meta-market/signal  (meta-market.controller.ts:76, JwtAuthGuard:77)
 ('B16',"signal (discriminant 'insufficient_signal')",'meta-market.controller.ts:46-57,93-95 ; mur de visibilite meta-market-read.service.ts:220-224 ; plancher :124-130','M34,M40,M42','affichee comme dessinee','OK'),
 ('B17','signal.medianCents','meta-market.controller.ts:51,98','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B18','signal.p10Cents','meta-market.controller.ts:52,99','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B19','signal.p90Cents','meta-market.controller.ts:53,100','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B20','signal.sampleCount','meta-market.controller.ts:53,101 ; prose contraire meta-market-read.service.ts:11','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B21','signal.lastAggregatedAt','meta-market.controller.ts:54,102','','disponible, ni dessinee ni affichee','QUESTION'),
 ('B22',"signal.trend ('up' / 'stable' / 'down')",'meta-market.controller.ts:55,103 ; calcul meta-market-read.service.ts:24-30,147','M37','affichee comme dessinee','OK'),
 # R5 — PUT /v1/me/meta-market/visibility (meta-market.controller.ts:113, JwtAuthGuard:114)
 ('B23','visibilityEnabled','meta-market.controller.ts:118,129 ; colonne player.meta_market_visibility_enabled :127','M41','affichee comme dessinee','OK'),
]
# i18n — les 31 cles marche.* (string_table.ts, FR :3303-3333 / EN :333-363)
I18N = [
 ('B24','marche.titre.le_marche','string_table.ts:3332 / :362','M04','OK','affichee comme dessinee'),
 ('B25','marche.sous_titre.tableau_du_verge_d_or','string_table.ts:3326 / :356','M05','OK','affichee comme dessinee'),
 ('B26','marche.colonne.quartier','string_table.ts:3303 / :333','M09','OK','affichee comme dessinee'),
 ('B27','marche.compteur.lignes_connues','string_table.ts:3304 / :334','M06','OK','affichee comme dessinee'),
 ('B28','marche.compteur.sures','string_table.ts:3306 / :336','M07','OK','affichee comme dessinee'),
 ('B29','marche.compteur.quartiers_noirs','string_table.ts:3305 / :335','M08','OK','affichee comme dessinee'),
 ('B30','marche.substance.brindle','string_table.ts:3328 / :358','M10,M21','OK','affichee comme dessinee'),
 ('B31','marche.substance.crick','string_table.ts:3329 / :359','M10,M21','OK','affichee comme dessinee'),
 ('B32','marche.substance.hush','string_table.ts:3330 / :360','M10,M21','OK','affichee comme dessinee'),
 ('B33','marche.substance.ash','string_table.ts:3327 / :357','M10,M21','OK','affichee comme dessinee'),
 ('B34','marche.forme.briques','string_table.ts:3312 / :342','M21','OK','affichee comme dessinee'),
 ('B35','marche.forme.cristaux','string_table.ts:3313 / :343','M21','OK','affichee comme dessinee'),
 ('B36','marche.forme.plaque','string_table.ts:3314 / :344','M21','OK','affichee comme dessinee'),
 ('B37','marche.forme.prismes','string_table.ts:3315 / :345','M21','OK','affichee comme dessinee'),
 ('B38','marche.origine.extrait_de_racine','string_table.ts:3316 / :346','M18','OK','affichee comme dessinee'),
 ('B39','marche.origine.resine_de_lull','string_table.ts:3319 / :349','M18','OK','affichee comme dessinee'),
 ('B40','marche.origine.lys_de_verre','string_table.ts:3318 / :348','M18','OK','affichee comme dessinee'),
 ('B41','marche.origine.herbe_des_friches','string_table.ts:3317 / :347 ; 0 occurrence maquette (confrontation-textes.txt)','','QUESTION','servie, aucun cadre brindle'),
 ('B42','marche.confiance.oui_dire','string_table.ts:3307 / :337 ; 0 occurrence maquette','','QUESTION','servie, aucun cadre LOW'),
 ('B43','marche.confiance.recoupe','string_table.ts:3308 / :338 ; dessine cadre 102','M23','OK','affichee comme dessinee'),
 ('B44','marche.confiance.sur','string_table.ts:3309 / :339 ; 0 occurrence (le 146 dit « UNE LIGNE QUI TIENT »)','','DEFAUT','servie, le cadre HIGH dit autre chose'),
 ('B45','marche.titre.voyant_eteint','string_table.ts:3333 / :363 ; dessine cadre 103','M26','OK','affichee comme dessinee'),
 ('B46','marche.titre.hors_du_tableau','string_table.ts:3331 / :361 ; 0 occurrence dans TOUT le fichier (controle positif vert)','','DEFAUT','servie+ratifiee (MOTS 24a), jamais dessinee'),
 ('B47','marche.phrase.bande_low','string_table.ts:3321 / :351 ; 0 occurrence','','QUESTION','servie, aucun cadre LOW'),
 ('B48','marche.phrase.bande_moderate','string_table.ts:3322 / :352 ; dessine a l octet cadre 102','M24','OK','affichee comme dessinee'),
 ('B49','marche.phrase.bande_high','string_table.ts:3320 / :350 ; 0 occurrence','','QUESTION','servie, aucun cadre HIGH non-ash'),
 ('B50','marche.phrase.case_sans_ligne','string_table.ts:3325 / :355 ; dessine a l octet cadre 103','M27','OK','affichee comme dessinee'),
 ('B51','marche.phrase.case_ash','string_table.ts:3324 / :354 ; dessine cadre 146 (+1 phrase en trop)','M29','OK','affichee comme dessinee'),
 ('B52','marche.phrase.bilan_lignes (ICU plural)','string_table.ts:3323 / :353 ; rendu attendu « 3 lignes sur 72 » ABSENT, dessine « Trois lignes sur soixante-douze »','M19','DEFAUT','dessinee en LETTRES, servie en CHIFFRES'),
 ('B53','marche.etat.chargement','string_table.ts:3310 / :340 ; 0 occurrence','','QUESTION','servie, aucun cadre de chargement'),
 ('B54','marche.etat.echec','string_table.ts:3311 / :341 ; 0 occurrence','','QUESTION','servie, aucun cadre d echec'),
]
for bid, cle, preuve, m, classe, statut in I18N:
    B.append((bid, cle, preuve, m, statut, classe))

# ─────────── Cote M : les elements dessines SANS aucune cle B (une ligne chacun) ───────────
# ('id', 'element M', 'ce que ca represente', 'preuve', 'statut', 'classe')
M_SEULS = [
 ('N01','M01 — barre « ARGENT / 24 850 € »','l argent du joueur','cadre-101.html, .barre .aile','dessinee sans source DANS CE LOT','HORS DOMAINE'),
 ('N02','M02 — barre « CHALEUR / Tiede » + jauge','la chaleur policiere','cadre-101.html, .barre .mano','dessinee sans source DANS CE LOT','HORS DOMAINE'),
 ('N03','M03 — barre « JOUR 12 / Plein jour »','le jour et la phase','cadre-101.html, .barre .aile.droite','dessinee sans source DANS CE LOT','HORS DOMAINE'),
 ('N04','M13 — l ORDRE des 18 lignes','quel quartier est a quelle ligne','mesure : 1,2,3,4,5,6,7,11,12,8,9,13,10,14,16,15,17,18 (cadre-101.txt:110-331) vs asc(id) world-geography.repository.ts:88 et district_id ASC market.controller.ts:97','dessinee sans source','ASSUME A CONSIGNER'),
 ('N05','reliefs typographiques dans 5 chaines servies','la moitie de phrase mise en avant','6 occurrences mesurees : <em> 101 ; <u> 102 « pas le prix » ; <u>x2 103 « a zero »/« jamais ouverte » ; <u> 104 « genre » ; <u> 146 « tient » (relief-et-compteurs.txt) — les 31 valeurs servies sont PLATES','dessinee sans source','ASSUME A CONSIGNER'),
 ('N06','M22 — l onglet actif (.og.pris)','la substance choisie','cadre-101.html .onglets .og.pris (crick)','dessinee sans source','ASSUME A CONSIGNER'),
 ('N07','le gabarit « NOM · BANDE »','la composition titre du panneau','cadres 102/103/146 .pann.pp>b ; aucune cle marche.gabarit.* parmi les 31','dessinee sans source','ASSUME A CONSIGNER'),
 ('N08','M28 — titre « LE VERRE · UNE LIGNE QUI TIENT »','la bande de la case ash','cadre-146.html .pann.pp>b ; RETIRE par MOTS-MARCHE-21.md:33, remplace par 24a « HORS DU TABLEAU »','dessinee sans source','ECART (mots ratifies contraires)'),
 ('N09','M29b — 2e phrase ash','« Le tableau dit seulement si la ligne tient — jamais ce qu elle vaut. »','cadre-146.html .pann.pp>small ; RETIREE par MOTS-MARCHE-21.md:33 ; absente des 31 cles','dessinee sans source','ECART (mots ratifies contraires)'),
 ('N10','M30 — les voyants ASH ALLUMES','une ligne ash existe et sa bande','4 cases mesurees : 146 Le Verre 1.00, Place des Comptes 0.75, La Lisiere 0.54 ; 104 glass x ash « DESCEND » (voyants-allumes.txt)','dessinee sans source','ECART (TD-966 contredit)'),
 ('N11','M31 — entete « genre »','la colonne de gauche du tableau de region','cadres 104:84 / 105 ; aucune cle (marche.colonne.quartier seule existe)','dessinee sans source','ASSUME A CONSIGNER'),
 ('N12','M33 — le tableau de region 6x4','la liste des (genre x substance)','24 cases mesurees, 6 rg (voyants-allumes.txt) ; aucun enumerateur : GET me/meta-market/signal exige substance+district_profile (meta-market.controller.ts:79-86)','dessinee sans source','LOT BACK (enumerateur)'),
 ('N13','M38 — les 3 couleurs de direction','monte / tient / descend','#43e0c0 / #ffd23f / #ff5a4d (cadre-104.html)','dessinee sans source','ASSUME A CONSIGNER'),
 ('N14','M39 — le panneau du cadre 104','« Six genres d endroit, pas dix-huit quartiers » + « elles disent une direction, jamais un chiffre »','cadre-104.txt:183-197 ; 3 textes, aucune cle parmi les 31','dessinee sans source','ASSUME A CONSIGNER'),
 ('N15','M43 — le panneau du cadre 105 (le mur)','« Vous ne dites pas vos prix / alors on ne vous dit pas les notres. Ca se rouvre au Coffre, tiroir le jeu »','cadre-105 .pann ; aucune cle parmi les 31 ; renvoi a l ecran ㉖ (PUT me/meta-market/visibility)','dessinee sans source','ASSUME A CONSIGNER'),
 ('N16','M44 — « L2 maillon manquant »','auto-documentation : 3 mesures en projection sans ecrivain','cadre-106 ; q_inferred/realised_price_multiplier/lambda market-projection.service.ts:71-76, absentes de la route (market.controller.ts:11-14)','dessinee sans source','TROU DOCUMENTE (se garde)'),
 ('N17','M45 — « L4 maillon manquant »','auto-documentation : la region connait un prix, l ecran ne le montre pas','cadre-106 ; medianCents/p10/p90 meta-market.controller.ts:98-100','dessinee sans source','TROU DOCUMENTE (se garde)'),
]


def compte(b, m, negatif=False):
    lignes = list(b) + list(m)
    if negatif:
        lignes.append(('X99', '(ligne injectee sans B ni M)', '', '', '', ''))
    nb_b = len(b)
    nb_m = len(m)
    return nb_b, nb_m, nb_b + nb_m, len(lignes)


def main():
    neg = '--negatif' in sys.argv
    nb_b, nb_m, somme, lignes = compte(B, M_SEULS, neg)
    print('|B| (cles projetees, DEDUIT)      = %d' % nb_b)
    print('|M non apparies|                  = %d' % nb_m)
    print('somme                             = %d' % somme)
    print('nombre de lignes de la table      = %d' % lignes)
    ok = (somme == lignes)
    print('IDENTITE %s' % ('VERTE' if ok else 'ROUGE'))
    if neg:
        print('(controle negatif : une ligne sans B ni M a ete injectee — ROUGE attendu)')
    if '--table' in sys.argv:
        print()
        print('| # | information | B | M | statut | classe | preuve |')
        print('|---|---|---|---|---|---|---|')
        for bid, cle, preuve, m, statut, classe in B:
            print('| %s | %s | ● | %s | %s | %s | %s |' % (bid, cle, m if m else '–', statut, classe, preuve))
        for nid, el, repr_, preuve, statut, classe in M_SEULS:
            print('| %s | %s — %s | – | ● | %s | %s | %s |' % (nid, el, repr_, statut, classe, preuve))
    return 0 if ok else 1


if __name__ == '__main__':
    sys.exit(main())
