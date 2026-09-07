#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Classe la population de `chaines-joueur.py` par la PROPRIÉTÉ demandée :
« cette phrase serait-elle comprise par quelqu'un qui ne sait pas comment le jeu est fabriqué ? »

⛔ LES VERDICTS SONT POSÉS PAR LECTURE, PAS PAR MOTIF, et c'est délibéré : la question porte sur
une propriété de langue, et un balayage sur des MOTS y répond à côté. Le vocabulaire d'atelier
n'a servi qu'au RAPPEL — s'assurer que la lecture n'avait rien laissé — puis chaque hit a été
ouvert. Ce rappel a produit CINQ FAUSSES ACCUSATIONS (classe « - ») : dans les cinq, le mot
d'atelier a son sens ordinaire, et `Commerce-écran` est même la traduction maison de
`FRONT_SHOP`, où « écran » veut dire paravent. ⇒ Ce sont elles le contrôle négatif du
classement : sans elles, rien ne prouverait que le critère n'est pas le mot.

⛔ UN FRAGMENT QUI NE MATCHE RIEN EST UN FRAGMENT FAUX, PAS UNE ABSENCE. Trois l'ont été ici et
aucun ne disait « cette chaîne n'existe pas » : une apostrophe TYPOGRAPHIQUE (U+2019 et non '),
une négation omise, et un faux négatif de l'extracteur. Le script REFUSE de compter un fragment
sans cible : il le liste en tête et sort non nul.
"""
import collections, subprocess, sys, pathlib

A = "A — INSTRUCTION DE DÉVELOPPEUR SERVIE AU JOUEUR"
B = "B — L'ARCHITECTURE COMME EXPLICATION (dire le trou est la doctrine ; le dire avec les mots de l'atelier ne l'est pas)"
C = "C — IDENTIFIANT INTERNE RENDU TEL QUEL"
D = "D — DIVULGATION"
E = "E — ÉNONCÉ DATÉ SERVI AU JOUEUR"
N = "HORS CLASSE — le mot d'atelier a ici son sens ORDINAIRE (contrôle négatif)"

VERDICTS = [
 (A, "vérifier la pile",                        "dit au joueur d'inspecter la pile Docker"),
 (A, "Check the seeder + stack",                "dit au joueur de lancer le seeder"),
 (A, "Quelqu'un doit écrire les textes",        "dit au joueur qu'un texte reste à écrire"),
 (B, "la route n'a rien rendu",                 "« route » = endpoint"),
 (B, "aucune route ne dit ce qu'elles",         "« route »"),
 (B, "aucune route ne connaît",                 "« route »"),
 (B, "Aucune route ne liste vos bâtiments",     "« route »"),
 (B, "Aucune route connue pour l'instant",      "« route » = endpoint, alors que l'écran voisin dit « CETTE ROUTE » pour un itinéraire"),
 (B, "aucune route n'existe encore",            "« route »"),
 (B, "la route voisine vise les affaires",      "« route voisine »"),
 (B, "aucune route de mutation de profil",      "« route de mutation »"),
 (B, "aucune route TOTP",                       "« route » + sigle de protocole"),
 (B, "aucune route ne l'écrit",                 "« route »"),
 (B, "aucune route de déconnexion joueur",      "« route joueur »"),
 (B, "aucune route joueur",                     "« route joueur » + « maquette » + « serveur »"),
 (B, "la route répond, et elle répond",         "« route »"),
 (B, "n'ont aucune surface joueur",             "« surface joueur »"),
 (B, "le domaine RGPD n'a pas de surface",      "« domaine » + « surface joueur »"),
 (B, "aucun domaine de sauvegarde",             "« domaine »"),
 (B, "chacune vit sur sa propre route",         "« route » + « service »"),
 (B, "aucune n'est branchée",                   "« branché » = câblé"),
 (B, "Aucune n'est branchée",                   "« branché »"),
 (B, "CE QUE LE SERVEUR ENVOIE VRAIMENT",       "« serveur »"),
 (B, "CE QUE LE SERVEUR NE DIT PAS",            "« serveur »"),
 (B, "CE QUE LE SERVEUR NE SERT PAS ENCORE",    "« serveur » + « servir » technique"),
 (B, "serveur la refuse tant que",              "« serveur »"),
 (B, "Le serveur a refusé",                     "« serveur »"),
 (B, "Le serveur ne peut pas dire",             "« serveur »"),
 (B, "On demande au serveur",                   "« serveur »"),
 (B, "Le serveur refusera",                     "« serveur »"),
 (B, "le serveur n'a rien rendu",               "« serveur »"),
 (B, "Le serveur n'a pas répondu",              "« serveur » LÀ OÙ SIX ÉCRANS NOMMENT UN SUJET DE FICTION"),
 (B, "le serveur ne propose aucune capacité",   "« serveur » + « capacité »"),
 (B, "le serveur ne rend que des clés",         "« clés de traduction » + « dictionnaire du jeu »"),
 (B, "le serveur ne dit pas ce qui manque",     "« serveur »"),
 (B, "le serveur rend des clés et un gabarit",  "« clés » + « gabarit à trous »"),
 (B, "le serveur refuse de juger",              "« serveur »"),
 (B, "Le serveur dit",                          "« serveur »"),
 (B, "c'est la valeur par défaut du serveur",   "« valeur par défaut » + « le corps » = corps de réponse"),
 (B, "cet écran ne peut",                       "« cet écran »"),
 (B, "CE QUE CET ÉCRAN SAIT",                   "« cet écran »"),
 (B, "CE QUE CET ÉCRAN NE PEUT PAS",            "« cet écran »"),
 (B, "rien sur cet écran n'en crée",            "« cet écran »"),
 (B, "pas un choix d’écran",               "« choix d'écran » (apostrophe typographique)"),
 (B, "l'écran ne montre rien plutôt que",       "« l'écran »"),
 (B, "Voilà l'écran tel qu'il s'afficherait",   "« l'écran tel qu'il s'afficherait »"),
 (B, "trou de",                                 "« trou de surface »"),
 (B, "Le même lot",                             "« lot » = lot de livraison du programme"),
 (B, "la seule grandeur servie",                "« grandeur servie »"),
 (B, "n'expose pas encore son vendeur",         "« expose »"),
 (B, "vérifié serveur",                         "« vérifié serveur »"),
 (B, "Scène indisponible pour ce quart",        "« Scène » + « quart horaire »"),
 (B, "à ouvrir depuis la fiche opérationnelle", "renvoie à un autre écran par son nom interne"),
 (C, "AND_IF",                                  "nom du combinateur EN CODE, servi comme libellé de bouton"),
 (C, "pas d'agrégat pour la ville",             "« agrégat »"),
 (C, "(sans clé)",                              "« clé »"),
 (C, "l'identifiant tient lieu de contenu",     "« identifiant »"),
 (C, "{dto.profile}",                           "champ de DTO interpolé BRUT, à côté d'un libellé résolu dans la même ligne"),
 (C, "fetch failed",                            "message d'exception réseau, en anglais"),
 (C, "Heat: Unavailable",                       "anglais + raison technique interpolée"),
 (D, "le serveur la rend en clair",             "dit au joueur que le masquage de son adresse est cosmétique"),
 (E, "au 2 septembre 2026",                     "date de mesure servie au joueur — et le commentaire du fichier dit lui-même « à re-mesurer »"),
 (N, "À QUOI ÇA SERT",                          "« servir » ordinaire"),
 (N, "est en route",                            "« en route » = en chemin"),
 (N, "CETTE ROUTE",                             "l'itinéraire du courrier, pas un endpoint"),
 (N, "se sert de gens",                         "« se servir de »"),
 (N, "Commerce-écran",                          "traduction maison de FRONT_SHOP : « écran » = paravent"),
]

ORDRE = [A, B, C, D, E, N]


def main():
    racine = pathlib.Path(__file__).resolve().parent.parent
    sortie = subprocess.run([sys.executable, str(racine / 'Tools' / 'chaines-joueur.py'),
                             '--controle'], cwd=racine, capture_output=True, text=True)
    if sortie.returncode != 0:
        sys.stderr.write(sortie.stderr)
        sys.stderr.write("⛔ l'extracteur a rendu ROUGE : on ne classe pas une population "
                         "dont les contrôles ne passent pas.\n")
        return 1
    rows = [l.split('\t') for l in sortie.stdout.splitlines() if l.count('\t') == 2]
    textes = collections.OrderedDict()
    for f, via, t in rows:
        textes.setdefault(t, f.replace('Assets/Scripts/', ''))

    classe, orphelins = collections.defaultdict(list), []
    for cl, frag, pourquoi in VERDICTS:
        hits = [(t, f) for t, f in textes.items() if frag in t]
        if not hits:
            orphelins.append(frag); continue
        for t, f in hits:
            classe[cl].append((f, t, pourquoi))

    out = ["# Chaînes joueur qui parlent du SYSTÈME au lieu de parler AU joueur", "",
           f"Population mesurée par `Tools/chaines-joueur.py` (contrôles verts) : "
           f"**{len(rows)} chaînes affichées, {len(textes)} textes distincts, 142 fichiers**.", "",
           "Verdicts posés **par lecture**. Le vocabulaire d'atelier n'a servi qu'au rappel ; "
           "il a produit cinq fausses accusations, gardées ici comme contrôle négatif.", ""]
    if orphelins:
        out += ["## ⛔ FRAGMENTS SANS CIBLE — un motif qui rend zéro est un motif FAUX", ""]
        out += [f"- `{o}`" for o in orphelins] + [""]
    for cl in ORDRE:
        if not classe[cl]: continue
        out += [f"## {cl} — {len(classe[cl])}", ""]
        for f, t, pourquoi in sorted(classe[cl]):
            out += [f"- `{f}`", f"  > {t}", f"  — {pourquoi}"]
        out += [""]
    print('\n'.join(out))
    if orphelins:
        sys.stderr.write(f"⛔ {len(orphelins)} fragment(s) sans cible — classement non fiable.\n")
        return 1
    total = sum(len(classe[c]) for c in ORDRE if c != N)
    sys.stderr.write(f"{total} chaînes de la classe · {len(classe[N])} fausses accusations écartées\n")
    return 0


if __name__ == '__main__':
    sys.exit(main())
