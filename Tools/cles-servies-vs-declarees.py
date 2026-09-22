#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""FORME G — une clé SERVIE que le DTO ne DÉCLARE PAS n'arrive jamais, et rien ne le dit.

⛔ POURQUOI CETTE CLASSE EST INVISIBLE AUX DEUX INSTRUMENTS EXISTANTS.
`JsonUtility` ignore EN SILENCE toute clé qu'aucun champ ne déclare : la donnée traverse le
réseau, entre dans le processus, et disparaît sans journal, sans erreur, sans avertissement.
Quatre colonnes, et c'est la troisième que personne ne regarde :

    DOMAINE   ce que le type du back autorise
    SERVI     ce que la projection met dans un corps de VRAIE réponse
    DÉCLARÉ   ce que le DTO client sait recevoir          ⇐ celle-ci
    RENDU     ce qu'un résolveur sait peindre

Un inventaire de ROUTES compte la clé SERVIE. Un balayage de RÉSOLVEURS la compte NON RENDUE.
Aucun des deux ne dit qu'elle n'est jamais ARRIVÉE.

⇒ CET ORACLE COMPARE **SERVI** À **DÉCLARÉ**, et dans LES DEUX SENS :
    servi \\ déclaré   la donnée est perdue au désérialiseur          (forme G)
    déclaré \\ servi   le champ est un fantôme : il ne reçoit jamais rien

⚠️ CE QU'IL NE PROUVE PAS, et c'est la moitié de sa valeur : il ne lit que les corps FIGÉS et
COMMITÉS de ce dépôt. Un corps daté du 2026-08-25 ne dit rien de ce que le back sert aujourd'hui.
**Un « aucun écart » ici est un plancher, pas un quitus** — la mesure qui tranche est une épingle
sur l'ensemble de clés d'une réponse VIVANTE. Chaque écart est donc rapporté AVEC la date et le
compte du corps qui l'a produit, pour qu'on sache ce qu'on lit.
"""
import json, pathlib, re, sys, argparse, collections

RACINE = pathlib.Path(__file__).resolve().parent.parent

# ⛔ APPARIEMENTS EXPLICITES — (DTO, chemin de clés dans la notation de ce rapport : `<nom du fichier>.<clé>[].<clé>…`).
# Le recouvrement ne suffit pas, mesuré le 2026-09-22 sur la classe même qu'il existe pour attraper :
#   · `GET /v1/me/buildings` sert `name_i18n.params` avec {enseigne, district, block} sur 16 bâtiments et {…, rang} sur 1 ;
#   · le DTO qui le DÉSÉRIALISE est `NomDeBatimentParamsDto` (ShellContracts), qui ne déclarait pas `rang` (7d2ebcde le lisait :
#     typecheck ROUGE, correctif 16cabe79) ;
#   · la descente automatique ne lit que le PREMIER objet d'une liste (3 clés), et saute les objets de moins de 4 clés ;
#   · et même sans ces deux angles morts, le recouvrement aurait choisi `BuildingNameParamsDto` (Operational, qui déclare
#     `rang` : 4/4 contre 3/4) et répondu « aucun écart ». *Apparier par ressemblance apparie ce qui se ressemble.*
# ⇒ Une ligne ici = un couple (DTO, corps) énoncé par qui SAIT quel type désérialise quelle route. Elle lit l'UNION des clés
#   de TOUS les objets au bout du chemin, sans plancher de taille ; un DTO ou un corps introuvable la rend ⛔ VIDE, jamais verte.
APPARIEMENTS = [
    ("NomDeBatimentParamsDto", "GET_me_buildings.buildings[].name_i18n.params"),   # forme G de ㉝, 16cabe79
    # ⑯ B05 — `flag_frequency_band` DÉCLARÉ avant d'être servi (S5-e, back 71ae6f89). Le seul corps figé à cartes date du
    # 25/08, d'AVANT S5-e : la ligne dit « déclaré, non servi » jusqu'à ce qu'un corps vivant post-S5 soit figé ici.
    ("FlagCardDto", "flag-review-seeded.cards[]"),
    # ⑯-8 — les params de `subject_name_i18n` (S5-a, back 04f35021), DÉCLARÉS avant d'être servis (union des 3 gabarits).
    # Aucun corps figé ne les porte encore : la ligne rend « EXPLICITE VIDE » jusqu'au premier corps vivant post-S5.
    ("SujetParamsDto", "flag-review-seeded.cards[].subject_name_i18n.params"),
    # ⑨-0 — la forme G de ⑨/⑩ : le recouvrement ne l'avait PAS vue sur le corps du 06/09 (il ne signalait que 2 clés, sur un
    # corps plus ancien) ; les appariements explicites montraient lieutenant, script_complexity_band, suggested_disposition,
    # method, source.
    ("ExceptionCardDto", "GET_exceptions_queue.exceptions[]"),
    ("CandidateActionDto", "GET_exceptions_queue.exceptions[].candidate_actions[]"),
    ("CandidateActionDto", "GET_exceptions_queue.exceptions[].suggested_action"),
]


def champs_des_dto(racine):
    """nom de classe -> ensemble des champs publics déclarés (ceux que JsonUtility peuple)."""
    out = {}
    decl = re.compile(r'\bclass\s+(\w+)\b')
    # ⛔ PAS D'ANCRE EN DÉBUT DE LIGNE : l'ancre `^\s*public` rendait invisibles les DTO écrits sur UNE ligne
    # (`public class X { public string a; public string b; }`) — dont `NomDeBatimentParamsDto`, le DTO de la forme G de ㉝.
    # Mesuré le 2026-09-22 par l'appariement explicite, qui l'a déclaré « introuvable » au lieu de passer vert.
    champ = re.compile(r'(?<![\w.])public\s+(?:[\w\.\[\]<>]+)\s+(\w+)\s*;')
    for p in (racine / 'Assets' / 'Scripts').rglob('*.cs'):
        s = p.read_text(encoding='utf-8', errors='replace')
        for m in decl.finditer(s):
            nom = m.group(1)
            i = s.find('{', m.end())
            if i < 0: continue
            prof, j = 0, i
            while j < len(s):
                if s[j] == '{': prof += 1
                elif s[j] == '}':
                    prof -= 1
                    if prof == 0: break
                j += 1
            corps = s[i:j]
            f = set(champ.findall(corps))
            if f: out.setdefault(nom, set()).update(f)
    return out


def donnees_figees(racine):
    """(chemin, provenance, données) pour chaque corps réel figé sous `Tools/`."""
    for p in sorted((racine / 'Tools').rglob('*.json')):
        try:
            d = json.loads(p.read_text(encoding='utf-8'))
        except Exception:
            continue
        prov = d.get('provenance') if isinstance(d, dict) else None
        corps = d.get('corps') if isinstance(d, dict) and 'corps' in d else d
        if not isinstance(corps, (dict, list)):
            continue
        data = corps.get('payload', {}).get('data') if isinstance(corps, dict) else None
        data = data or (corps.get('data') if isinstance(corps, dict) else None) or corps
        yield p, prov, data


def cles_au_chemin(data, segments):
    """(nombre d'objets, UNION de leurs clés) au bout du chemin — TOUS les éléments de chaque liste traversée."""
    courants = [data]
    for seg in segments:
        liste = seg.endswith('[]')
        cle = seg[:-2] if liste else seg
        suivants = []
        for o in courants:
            if isinstance(o, dict) and cle in o:
                v = o[cle]
                if liste and isinstance(v, list): suivants.extend(v)
                elif not liste: suivants.append(v)
        courants = suivants
    objets = [o for o in courants if isinstance(o, dict)]
    ks = set()
    for o in objets: ks |= set(o)
    return len(objets), ks


def corps_figes(racine):
    """(chemin, provenance, chemin de clé, ensemble de clés) pour chaque objet d'un corps réel."""
    res = []
    for p, prov, data in donnees_figees(racine):

        def descendre(o, chemin):
            if isinstance(o, list):
                objets = [x for x in o if isinstance(x, dict)]
                if objets:
                    ks = set()
                    for x in objets: ks |= set(x)
                    res.append((p, prov, chemin, ks))
                    for x in objets[:1]:
                        for k, v in x.items(): descendre(v, f'{chemin}[].{k}')
            elif isinstance(o, dict):
                res.append((p, prov, chemin, set(o)))
                for k, v in o.items(): descendre(v, f'{chemin}.{k}')

        descendre(data, p.stem)
    return res


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--dto', action='append', default=[],
                    help='NomDto=fichier.cle[].cle — apparie explicitement un DTO à un corps (s\'ajoute à APPARIEMENTS)')
    ap.add_argument('--verifier', action='store_true')
    a = ap.parse_args()

    dtos = champs_des_dto(RACINE)
    corps = corps_figes(RACINE)
    print(f"{len(dtos)} classes à champs publics · {len(corps)} objets lus dans des corps figés\n")

    # Appariement par RECOUVREMENT : un corps est apparié au DTO dont les champs recouvrent le
    # mieux ses clés. ⛔ Jamais par le NOM — un appariement par nom apparie ce qui se ressemble,
    # pas ce qui correspond, et ce dépôt a déjà payé l'appariement par voisinage trois fois.
    # ⛔ GROUPÉ PAR DÉFAUT. La v1 imprimait un bloc PAR OBJET : 2912 objets, 422 écarts, et la
    # sortie était illisible — donc inutilisable, donc jamais relue. *Un instrument dont la sortie
    # noie son signal ne mesure rien qui serve.* On groupe par (DTO, sens, clés) et on montre un
    # exemplaire daté de chaque.
    trouves = collections.defaultdict(list)
    for p, prov, chemin, ks in corps:
        if len(ks) < 4:
            continue
        best, score = None, 0.0
        for nom, f in dtos.items():
            if not f: continue
            sc = len(ks & f) / len(ks | f)
            if sc > score: best, score = nom, sc
        if best is None or score < 0.5:
            continue
        f = dtos[best]
        manquants, fantomes = tuple(sorted(ks - f)), tuple(sorted(f - ks))
        if manquants:
            trouves[(best, 'SERVI, NON DÉCLARÉ', manquants)].append((p, prov, chemin))
        if fantomes:
            trouves[(best, 'déclaré, non servi', fantomes)].append((p, prov, chemin))

    # Les appariements EXPLICITES — lus après le recouvrement, et imprimés même sans écart : une ligne qui ne dit rien
    # ne se distingue pas d'une ligne qui n'a rien lu.
    explicites = list(APPARIEMENTS)
    for spec in a.dto:
        nom, _, chemin = spec.partition('=')
        explicites.append((nom.strip(), chemin.strip()))
    vides = 0
    lignes_explicites = []
    for nom, chemin in explicites:
        fichier, _, reste = chemin.partition('.')
        segments = [x for x in reste.split('.') if x]
        lus = [(p, prov) + cles_au_chemin(data, segments)
               for p, prov, data in donnees_figees(RACINE) if p.stem == fichier]
        lus = [x for x in lus if x[2] > 0]
        if nom not in dtos or not lus:
            vides += 1
            quoi = f"DTO « {nom} » introuvable dans Assets/Scripts" if nom not in dtos else f"aucun objet lu sous « {chemin} »"
            lignes_explicites.append(f"⛔ EXPLICITE VIDE  {nom} ← {chemin} : {quoi} — l'appariement ne mesure rien")
            continue
        f = dtos[nom]
        for p, prov, n, ks in lus:
            manquants, fantomes = tuple(sorted(ks - f)), tuple(sorted(f - ks))
            if manquants:
                trouves[(f'{nom} (explicite)', 'SERVI, NON DÉCLARÉ', manquants)].append((p, prov, chemin))
            if fantomes:
                trouves[(f'{nom} (explicite)', 'déclaré, non servi', fantomes)].append((p, prov, chemin))
            lignes_explicites.append(
                f"{'⛔' if manquants else '✓ '} explicite {nom} ← {chemin} : {n} objet(s), clés servies {sorted(ks)}, "
                f"déclarées {sorted(f)} · servi non déclaré {list(manquants)} · déclaré non servi {list(fantomes)} "
                f"· {p.relative_to(RACINE)}")
    for l in lignes_explicites:
        print(l)
    if lignes_explicites:
        print()

    ecarts = sum(1 for (_, sens, _) in trouves if sens.startswith('SERVI')) + vides
    for (nom, sens, cles), lieux in sorted(trouves.items(), key=lambda kv: (-len(kv[1]), kv[0][0])):
        p, prov, chemin = lieux[0]
        date = (prov or {}).get('date', 'date inconnue')
        compte = (prov or {}).get('compte', 'compte inconnu')
        marque = '⛔' if sens.startswith('SERVI') else '⚠️ '
        print(f"{marque} {nom:28s} {sens:20s} {list(cles)}")
        print(f"     {len(lieux)} corps · exemplaire : {p.relative_to(RACINE)} · {date} · {compte}")
    print()
    print(f"⇒ {ecarts} classe(s) de clé SERVIE NON DÉCLARÉE · {len(trouves) - ecarts} classe(s) de champ déclaré sans source dans le corps lu.")
    print("⚠️ PLANCHER, pas quitus : ne lit que les corps FIGÉS de ce dépôt. Un « 0 » ici ne dit "
          "rien de ce que le back sert AUJOURD'HUI — seule une épingle sur les clés d'une réponse "
          "vivante tranche.")
    return 1 if (a.verifier and ecarts) else 0


if __name__ == '__main__':
    sys.exit(main())
