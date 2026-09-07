#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Classe la population de `chaines-joueur.py` — et la TIENT, par un cliquet.

⛔ LES VERDICTS SONT POSÉS PAR LECTURE, PAS PAR MOTIF. La question est une propriété de langue
(« quelqu'un qui ne sait pas comment le jeu est fabriqué comprendrait-il ? ») et une propriété ne
se met pas en regex. Le vocabulaire d'atelier n'a servi qu'au RAPPEL, puis chaque hit a été
OUVERT. Ce rappel a produit six fausses accusations (classe `N`) : le mot y a son sens ordinaire,
et `Commerce-écran` est la traduction maison de `FRONT_SHOP`, où « écran » veut dire paravent.
⇒ Elles restent ici : sans elles, rien ne prouverait que le critère est la propriété, pas le mot.

⛔⛔ CHAQUE MOTIF PORTE SA VALEUR ATTENDUE, ET LE CLIQUET ROUGIT DANS LES DEUX SENS.
Un motif à `0` n'est PAS « satisfait » par défaut : la première version de ce fichier passait au
rouge après les correctifs, en criant « fragment sans cible » sur les dix motifs que le lot venait
justement de fermer. C'est l'inversion classique — *un contrôle qui exige la présence de ce qu'on
supprime accuse le correctif*. La forme juste, celle que le socle prescrit : écrire l'attendu
AVANT et APRÈS, et faire rougir tout écart.
  · `n > attendu`  ⇒ la classe REVIENT (quelqu'un a réécrit la phrase fautive ailleurs)
  · `n < attendu`  ⇒ l'épingle est PÉRIMÉE (la chaîne a bougé) — à re-mesurer, pas à ignorer
⇒ Les motifs de B et N sont épinglés à leur valeur mesurée : ils ne sont pas corrigés, ils sont
  SURVEILLÉS. Un 54ᵉ « le serveur … » ferait rougir le cliquet le jour où il est écrit.

⚠️ CE QUE CE CLIQUET NE VOIT PAS, et il faut le dire : il surveille les FORMULATIONS connues.
Une phrase de la même classe écrite avec d'autres mots passe. Il ferme la récidive, pas la classe.
"""
import collections, subprocess, sys, pathlib

A = "A — INSTRUCTION DE DÉVELOPPEUR SERVIE AU JOUEUR"
B = "B — L'ARCHITECTURE COMME EXPLICATION (dire le trou est la doctrine ; le dire avec les mots de l'atelier ne l'est pas)"
C = "C — IDENTIFIANT INTERNE RENDU TEL QUEL"
D = "D — DIVULGATION"
E = "E — ÉNONCÉ DATÉ SERVI AU JOUEUR"
R = "R — REVENDIQUÉ PUIS RETIRÉ : mesuré DÉLIBÉRÉ en ouvrant la cible"
N = "N — HORS CLASSE : le mot d'atelier a ici son sens ORDINAIRE (contrôle négatif)"

# (classe, fragment, attendu, pourquoi)
VERDICTS = [
 (A, "vérifier la pile",                        0, "CLOS — disait au joueur d'inspecter la pile Docker"),
 (A, "Check the seeder + stack",                0, "CLOS — disait au joueur de lancer le seeder (4 sites)"),
 (A, "Quelqu'un doit écrire les textes",        0, "CLOS — s'adressait au studio, pas au joueur"),

 (E, "au 2 septembre 2026",                     0, "CLOS — date de mesure servie au joueur ; le fichier disait lui-même « à re-mesurer »"),
 (D, "le serveur la rend en clair",             0, "CLOS — mesuré côté back : /v1/me est scopé au compte du jeton, aucune route ne rend l'adresse d'un tiers. La phrase disait VRAI et présentait le droit d'accès comme une faiblesse. Le masquage reste."),

 (C, "pas d'agrégat pour la ville",             0, "CLOS — « agrégat ». ⚠️ « indisponible » conservé : CharpenteAccueilPanneaux l'asserte"),
 (C, "fetch failed",                            0, "CLOS — la raison nommait un verbe HTTP"),
 (C, "{dto.profile}",                           1, "⚠️ ROUTÉ ATELIER — glass|lattice|spine|stack|tidewater|verge servis bruts, AUCUN résolveur n'existe ⇒ six mots de fiction à écrire, ce n'est pas une correction. ⛔ ET IL Y A UN SECOND SITE que cet outil ne peut pas voir : CityMapController:1052 passe la VARIABLE (`DetailRow(\"Profile\", cell.Model.profile)`) — la population ne contient que des LITTÉRAUX."),
 (C, "Heat: Unavailable",                       1, "⚠️ LOT ANGLAIS — le panneau entier est encore anglais (`RenderBar(heatText, \"Heat\", …)`, idem Friction/Stress) ; la conversion i18n du 2026-09-03 n'a converti que Cohésion. Je ne devance pas ce lot."),

 (R, "AND_IF",                                  1, "RETIRÉ DE C — c'est le token de la GRAMMAIRE BACK que le joueur écrit dans ses règles. LieutenantUiExtensionPlayModeTests:607 asserte que ces tokens sont exposés « grounded VERBATIM in the backend grammar », et RuleEditorTier2:219 épingle la source sérialisée. L'afficher est délibéré."),
 (R, "(sans clé)",                              2, "RETIRÉ DE C — HorizonScreenController:180 porte, en code, « Le titre EST la clé : c'est ce que la maquette ratifiée montre »."),
 (R, "l'identifiant tient lieu de contenu",     1, "RETIRÉ DE C — même doctrine du trou honnête : l'écran DIT que l'identifiant remplace un texte non écrit. Aucun commentaire ne le ratifie explicitement ⇒ laissé en l'état plutôt que tranché sans maquette."),

 (B, "la route n'a rien rendu",                 4, "« route » = endpoint"),
 (B, "aucune route ne dit ce qu'elles",         2, "« route »"),
 (B, "aucune route ne connaît",                 2, "« route »"),
 (B, "Aucune route ne liste vos bâtiments",     1, "« route »"),
 (B, "Aucune route connue pour l'instant",      2, "« route » = endpoint, alors que l'écran voisin dit « CETTE ROUTE » pour un itinéraire"),
 (B, "aucune route n'existe encore",            1, "« route »"),
 (B, "la route voisine vise les affaires",      1, "« route voisine »"),
 (B, "aucune route de mutation de profil",      1, "« route de mutation »"),
 (B, "aucune route TOTP",                       1, "« route » + sigle de protocole"),
 (B, "aucune route ne l'écrit",                 1, "« route »"),
 (B, "aucune route de déconnexion joueur",      1, "« route joueur »"),
 (B, "aucune route joueur",                     1, "« route joueur » + « maquette » + « serveur »"),
 (B, "la route répond, et elle répond",         1, "« route »"),
 (B, "n'ont aucune surface joueur",             1, "« surface joueur »"),
 (B, "le domaine RGPD n'a pas de surface",      1, "« domaine » + « surface joueur »"),
 (B, "aucun domaine de sauvegarde",             1, "« domaine »"),
 (B, "chacune vit sur sa propre route",         1, "« route » + « service »"),
 (B, "aucune n'est branchée",                   1, "« branché » = câblé"),
 (B, "Aucune n'est branchée",                   1, "« branché »"),
 (B, "CE QUE LE SERVEUR ENVOIE VRAIMENT",       6, "« serveur »"),
 (B, "CE QUE LE SERVEUR NE DIT PAS",            2, "« serveur »"),
 (B, "CE QUE LE SERVEUR NE SERT PAS ENCORE",    1, "« serveur » + « servir » technique"),
 (B, "serveur la refuse tant que",              1, "« serveur »"),
 (B, "Le serveur a refusé",                     5, "« serveur »"),
 (B, "Le serveur ne peut pas dire",             1, "« serveur »"),
 (B, "On demande au serveur",                   1, "« serveur »"),
 (B, "Le serveur refusera",                     1, "« serveur »"),
 (B, "le serveur n'a rien rendu",               1, "« serveur »"),
 (B, "Le serveur n'a pas répondu",              0, "CLOS — le SEPTIÈME de la formule maison, le seul qui nommait la machine. Six écrans disent « Le profil / la file / le commissariat / le tableau / la vitrine / l'état du tutoriel n'a pas répondu » ; ㉜ disait « le serveur ». Repris sur le patron de son jumeau structurel (Reputation:579-584 : titre « LE MIROIR EST INDISPONIBLE » + sous-titre « Le miroir ne répond pas »)."),
 (B, "le serveur ne propose aucune capacité",   1, "« serveur » + « capacité »"),
 (B, "le serveur ne rend que des clés",         1, "« clés de traduction » + « dictionnaire du jeu »"),
 (B, "le serveur ne dit pas ce qui manque",     1, "« serveur »"),
 (B, "le serveur rend des clés et un gabarit",  1, "« clés » + « gabarit à trous »"),
 (B, "le serveur refuse de juger",              1, "« serveur »"),
 (B, "Le serveur dit",                          1, "« serveur »"),
 (B, "c'est la valeur par défaut du serveur",   0, "CLOS INCIDEMMENT — « valeur par défaut » + « le corps » (= corps de réponse) vivaient dans la MÊME phrase que l'énoncé daté de E. Les retirer ensemble était le seul geste possible ; je le déclare plutôt que de le compter comme un gain de B."),
 (B, "écran ne peut donc pas",                  1, "« cet écran » ⚠️ motif re-casé : ma réécriture a mis une majuscule à « Cet », et le fragment minuscule rendait 0 — un zéro de CASSE, pas de suppression"),
 (B, "CE QUE CET ÉCRAN SAIT",                   3, "« cet écran »"),
 (B, "CE QUE CET ÉCRAN NE PEUT PAS",            2, "« cet écran »"),
 (B, "rien sur cet écran n'en crée",            2, "« cet écran »"),
 (B, "pas un choix d’écran",                    1, "« choix d'écran » (apostrophe typographique — le fragment ASCII rendait 0)"),
 (B, "l'écran ne montre rien plutôt que",       1, "« l'écran »"),
 (B, "Voilà l'écran tel qu'il s'afficherait",   1, "« l'écran tel qu'il s'afficherait » — CONSERVÉ : c'est le cadre ratifié de la maquette"),
 (B, "trou de",                                 1, "« trou de surface »"),
 (B, "Le même lot",                             1, "« lot » = lot de livraison du programme"),
 (B, "la seule grandeur servie",                1, "« grandeur servie »"),
 (B, "n'expose pas encore son vendeur",         1, "« expose »"),
 (B, "vérifié serveur",                         1, "« vérifié serveur »"),
 (B, "Scène indisponible pour ce quart",        1, "« Scène » + « quart horaire »"),
 (B, "à ouvrir depuis la fiche opérationnelle", 1, "renvoie à un autre écran par son nom interne"),

 (N, "À QUOI ÇA SERT",                          1, "« servir » ordinaire"),
 (N, "est en route",                            1, "« en route » = en chemin"),
 (N, "CETTE ROUTE",                             1, "l'itinéraire du courrier, pas un endpoint"),
 (N, "se sert de gens",                         2, "« se servir de »"),
 (N, "Commerce-écran",                          3, "traduction maison de FRONT_SHOP : « écran » = paravent"),
]

ORDRE = [A, E, D, C, R, B, N]


def mesurer():
    racine = pathlib.Path(__file__).resolve().parent.parent
    s = subprocess.run([sys.executable, str(racine / 'Tools' / 'chaines-joueur.py'), '--controle'],
                       cwd=racine, capture_output=True, text=True)
    if s.returncode != 0:
        sys.stderr.write(s.stderr)
        sys.stderr.write("⛔ l'extracteur est ROUGE : on ne classe pas une population dont les "
                         "contrôles ne passent pas.\n")
        sys.exit(1)
    return [l.split('\t') for l in s.stdout.splitlines() if l.count('\t') == 2]


def main():
    verifier = '--verifier' in sys.argv
    rows = mesurer()
    textes = collections.OrderedDict()
    for f, via, t in rows:
        textes.setdefault(t, f.replace('Assets/Scripts/', ''))

    ecarts, classe = [], collections.defaultdict(list)
    for cl, frag, attendu, pourquoi in VERDICTS:
        n = sum(1 for f, via, t in rows if frag in t)
        if n != attendu:
            ecarts.append((frag, attendu, n))
        vus = collections.OrderedDict((t, f) for t, f in textes.items() if frag in t)
        for t, f in vus.items():
            classe[cl].append((f, t, pourquoi))
        if not vus and attendu == 0:
            classe[cl].append(("—", "(plus aucune occurrence)", pourquoi))

    if verifier:
        for frag, attendu, n in ecarts:
            sens = "LA CLASSE REVIENT" if n > attendu else "ÉPINGLE PÉRIMÉE (la chaîne a bougé)"
            print(f"⛔ {sens} : attendu {attendu}, mesuré {n} — « {frag} »", file=sys.stderr)
        print(f"{len(VERDICTS)} motifs · {len(ecarts)} écart(s) · population {len(rows)}",
              file=sys.stderr)
        return 1 if ecarts else 0

    out = ["# Chaînes joueur qui parlent du SYSTÈME au lieu de parler AU joueur", "",
           f"Population mesurée par `Tools/chaines-joueur.py` (contrôles verts) : "
           f"**{len(rows)} chaînes affichées, {len(textes)} textes distincts**.", "",
           "Chaque motif porte sa valeur **attendue** ; `--verifier` rougit dans les deux sens "
           "(la classe revient / l'épingle est périmée).", ""]
    if ecarts:
        out += ["## ⛔ ÉCARTS AU CLIQUET", ""] + \
               [f"- `{f}` — attendu {a}, mesuré {n}" for f, a, n in ecarts] + [""]
    for cl in ORDRE:
        if not classe[cl]: continue
        out += [f"## {cl} — {len(classe[cl])}", ""]
        for f, t, pourquoi in sorted(classe[cl]):
            out += [f"- `{f}`", f"  > {t}", f"  — {pourquoi}"]
        out += [""]
    print('\n'.join(out))
    return 0


if __name__ == '__main__':
    sys.exit(main())
