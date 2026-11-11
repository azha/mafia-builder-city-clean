#!/usr/bin/env python3
# Contrôle d'arithmétique du mandat (§5) : |clés B| + |éléments M non appariés| + |rendus F sans source|
# = nombre de lignes de la table de couverture.
#
#   python3 -I controle-arithmetique.py            → contrôle POSITIF  (doit rendre EXIT=0)
#   python3 -I controle-arithmetique.py --negatif  → contrôle NÉGATIF  (doit rendre EXIT≠0)
#
# La table ci-dessous est recopiée de `rapport.md` § Table de couverture complète.
import sys

# (id, origine, information)  — origine : 'B' = clé servie, 'M' = élément M non apparié, 'F' = rendu F sans source
LIGNES = [
    ('L01', 'B', 'audit_risk_bucket — niveau (crans) de la piste « la comptabilité »'),
    ('L02', 'B', 'effluent_visibility_bucket — niveau (crans) de la piste « ce qui sort des cuves »'),
    ('L03', 'B', 'lifestyle_alarm_bucket — niveau (crans) de la piste « le train de vie »'),
    ('L04', 'B', 'lifestyle_lieutenant_name — le NOM du lieutenant dans le titre de la piste'),
    ('L05', 'B', 'audit_risk_label_key — le mot sous la piste « la comptabilité »'),
    ('L06', 'B', 'effluent_visibility_label_key — le mot sous la piste « ce qui sort des cuves »'),
    ('L07', 'B', 'lifestyle_alarm_label_key — le mot sous la piste « le train de vie »'),
    ('L08', 'B', 'actors[] — le roster des acteurs et son cardinal'),
    ('L09', 'B', 'actors[].actorRef — la référence montrée sous le type'),
    ('L10', 'B', 'actors[].actorType — « Avocat » / « Greffier »'),
    ('L11', 'B', 'actors[].status — mot, encre, silhouette, opacité du « parti »'),
    ('L12', 'B', 'intelCostCents — le PRIX d’un renseignement'),
    ('L13', 'B', 'activeCases — les affaires en cours (GET /v1/me/legal)'),
    ('L14', 'B', 'lawyerRoster — le NOM de l’avocat à la place de la référence'),
    ('N1', 'M', 'dénominateur « /3 » du compteur « pistes chaudes » (dessiné en dur)'),
    ('N2', 'M', '« Ça se remarque » : la ligne sous le mot de la piste des cuves à `visible`'),
    ('N3', 'M', '« pistes chaudes » — le numérateur (dérivé des bandes)'),
    ('N4', 'M', '« franchies » — le compteur des pistes au dernier cran (dérivé)'),
    ('N5', 'M', '« acteurs qui tiennent » / « connus » — dérivé du roster'),
    ('N6', 'M', '« qui ont peur » — dérivé du roster (vue acteurs)'),
    ('N7', 'M', 'le geste « renseignement » par ligne d’acteur (dessiné ÉTEINT)'),
    ('N8', 'M', 'le CTA « ACHETER DU RENSEIGNEMENT » (dessiné ÉTEINT)'),
    ('N9', 'M', 'l’état « Rien à votre nom » (vue Vide, cadre 135)'),
    ('F1', 'F', 'le panneau de repli « Pas de réponse » sur échec réseau (aucun cadre ㊴)'),
]

ATTENDU = {'B': 14, 'M': 9, 'F': 1}


def main() -> int:
    lignes = list(LIGNES)
    if '--negatif' in sys.argv:
        # CONTRÔLE NÉGATIF : une ligne de plus que ce que les trois comptes annoncent.
        lignes.append(('X99', 'X', 'ligne injectée — le contrôle DOIT rougir'))

    compte = {'B': 0, 'M': 0, 'F': 0}
    for _id, origine, _info in lignes:
        if origine in compte:
            compte[origine] += 1

    ids = [l[0] for l in lignes]
    rc = 0
    if len(set(ids)) != len(ids):
        print('ÉCHEC : identifiants de ligne en double')
        rc = 1

    somme = compte['B'] + compte['M'] + compte['F']
    print(f"|clés B|              = {compte['B']}  (attendu {ATTENDU['B']})")
    print(f"|M non appariés|      = {compte['M']}  (attendu {ATTENDU['M']})")
    print(f"|F sans source|       = {compte['F']}  (attendu {ATTENDU['F']})")
    print(f"somme                 = {somme}")
    print(f"lignes de la table    = {len(lignes)}")

    for k in ('B', 'M', 'F'):
        if compte[k] != ATTENDU[k]:
            print(f"ÉCHEC : |{k}| = {compte[k]} ≠ {ATTENDU[k]}")
            rc = 1
    if somme != len(lignes):
        print(f"ÉCHEC : {somme} ≠ {len(lignes)} — une ligne n’a pas d’origine comptée")
        rc = 1
    print('OK' if rc == 0 else 'ROUGE')
    return rc


if __name__ == '__main__':
    sys.exit(main())
