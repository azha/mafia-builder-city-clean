#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""CHAQUE ÉCRAN MONTÉ A SON DOSSIER DE JUGE — index, référence à la résolution de travail, mandat (§DA-3).

Un juge à contexte vierge doit trouver EN UNE COMMANDE la référence de l'écran qu'il juge. Mesuré le
2026-09-03 : 30 dossiers aux noms hétérogènes, 143 PNG v6, aucun index écran → dossier → cadres.

Ce script produit, à partir de trois SOURCES mesurées et d'une TABLE d'attribution écrite ici :
  1. `Tools/juge-visuel/INDEX.md` — une ligne par locataire monté par `AppShell.cs` (les sites
     `MountTenant<…>` et `MonterLocataireEnSurimpression<…>`, lus dans le fichier) : symbole,
     contrôleur, dossier, cadres (page + numéros + SHA atelier), référence, planche en jeu attendue
     (existe / absente), état `front.md`, confiance de l'attribution (mesurée / déduite) ;
  2. `Tools/juge-visuel/<dossier>/reference-1080x2102.png` — le cadre NOMINAL rendu par
     `rendre-tel.py` à ×3,6 (300 px CSS → 1080 px), vérifié anti-crop par `rendre-maquette.py`.
     ⚠️ 1080×2102 et non 1080×2400 : le `.tel` de l'atelier est en 9:17,5 (583,33 px CSS) ; le
     téléphone cible est en 9:20. Étirer ou compléter à 2400 fabriquerait une image que personne n'a
     ratifiée — le juge aligne par PARTIES (mandat §1, en % de la largeur), jamais par le pixel absolu ;
  3. `Tools/juge-visuel/<dossier>/mandat.md` — pré-rempli (but, chemin joueur, routes lues dans le
     contrôleur, cadres, référence, planche, état) selon `.claude/skills/juge-visuel/` du back.

GARDES : tout contrôleur monté par AppShell sans ligne dans la table ⇒ exit 1 (l'index ne peut pas
être silencieusement incomplet) ; un cadre nominal hors de sa page ⇒ exit 1 ; une référence rendue
qui n'a pas la taille attendue ⇒ exit 1 (rendre-tel l'asserte). Une ligne « aucune maquette » est
une ligne, pas une absence.

Usage :  python3 Tools/juge-visuel/construire-dossiers.py [--controle] [--sans-rendu]
"""
import json, os, re, subprocess, sys

CLIENT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
ATELIER = os.path.expanduser("~/project/atelier3d-mafia")
BACK = os.path.expanduser("~/project/mafia-clean-city")
JV = os.path.join(CLIENT, "Tools", "juge-visuel")
S4, S6, S1 = "ecrans-brennar-4.html", "ecrans-brennar-6.html", "ecrans-brennar.html"
ECHELLE = 3.6

# ---------------------------------------------------------------------------------------------
# TABLE D'ATTRIBUTION — écrite à la main depuis les preuves du 2026-09-03 (commentaires des
# contrôleurs, titres des cadres, dossiers existants, front.md). `confiance` dit comment chaque
# rattachement a été établi : "mesurée" = le contrôleur ou le dossier cite le cadre ; "déduite" = par
# le titre du cadre seulement ; "aucune" = pas de maquette connue.
# cadres : (page, [indices]) ; nominal : (page, index) ; planche : fichier attendu sous Assets/Screenshots.
# ---------------------------------------------------------------------------------------------
TABLE = [
 dict(sym="③", ctl="CityMapController", dossier="carte", chemin="onglet EMPIRE (défaut)",
      cadres=[(S6, list(range(22, 25)))], nominal=(S6, 22), planche="carte_ville_1080x2400.png",
      confiance="mesurée", note="ville peinte livrée le 03/09 (TD-494) ; cadres 22-24 avec les noms de fiction (TD-492)"),
 dict(sym="④", ctl="DashboardController", dossier="accueil", chemin="surimpression à l'ouverture de session (acquisition), puis Accueil",
      cadres=[], nominal=None, planche="planche_l_accueil_1080x2400.png",
      confiance="aucune", note="AUCUNE maquette (front.md:1609 « [ ] maquetté ») — les cadres 20-21 « Le Bureau du patron » sont ⑱ le menu Plus (front.md:1567), corrigé par l'orchestrateur le 03/09"),
 dict(sym="⑤", ctl="DecisionDetailScreenController", dossier="decision-du-jour", chemin="surimpression depuis la carte de tête (hl_card) de l'Accueil",
      cadres=[(S4, list(range(4, 9))), (S6, list(range(4, 9)))], nominal=(S4, 4), planche="decision_du_jour_1080x2400.png",
      confiance="mesurée", note="série 4 cadres 4-8 RATIFIÉS par l'user (« ok top on garde comme ça », 2026-08-26)"),
 dict(sym="⑥", ctl="LieutenantScreenController", dossier="famille", chemin="onglet FAMILLE",
      cadres=[(S1, ["organigramme (rangée « La Famille »)"])], nominal=None, planche="famille_1080x2400.png",
      confiance="mesurée", note="référence = Tools/family-organigramme-reference-1120.png (1120×1850) et famille/ecran-canon.png ; ⑦ ⑧ sont des sections du même contrôleur"),
 dict(sym="⑪", ctl="LaunderingController", dossier="coffre", chemin="onglet FILIÈRE",
      cadres=[], nominal=None, planche="planche_le_coffre_1080x2400.png",
      confiance="aucune", note="aucun cadre de série 4/6 ne dessine le pipeline ; coffre/ecran-canon.png est le seul canon"),
 dict(sym="⑯", ctl="DailyReviewScreenController", dossier="revue-du-jour", chemin="Plus → LA REVUE DU JOUR",
      cadres=[(S4, list(range(0, 4))), (S6, list(range(0, 4)))], nominal=(S4, 0), planche="revue_du_jour_seuil-force-0.1_1080x2400.png",
      confiance="mesurée", note="série 4 cadres 0-3 = le canon ratifié (revue-du-jour/v4-0..3.png)"),
 dict(sym="㊲", ctl="ReputationScreenController", dossier="reputation", chemin="Plus → LA RÉPUTATION",
      cadres=[(S6, list(range(119, 125)))], nominal=(S6, 120), planche="screen_b3_reputation_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-120.png"),
 dict(sym="㉟", ctl="SellingScreenController", dossier="vente", chemin="Plus → LA VENTE",
      cadres=[(S6, list(range(107, 113)))], nominal=(S6, 107), planche="planche_la_vente_1080x2400.png",
      confiance="déduite", note="cadres 107-112 « La vente » par le titre ; dealers en prénoms servis (§DA-2)"),
 dict(sym="㉓", ctl="ShopScreenController", dossier="compte", chemin="Plus → LA VITRINE",
      cadres=[(S6, [98, 99, 100])], nominal=(S6, 98), planche="planche_la_vitrine_1080x2400.png",
      confiance="déduite", note="déduit par titre (98-100) — le contrôleur dit « cadres 48-50 », numérotation d'une autre série ; canon compte/boutique-canon.png"),
 dict(sym="⑮", ctl="InspectionScreenController", dossier="police", chemin="Plus → LES INSPECTIONS",
      cadres=[(S6, list(range(31, 36)))], nominal=(S6, 31), planche="planche_les_inspections_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite les cadres 31-35 ; canon police/inspections-canon.png"),
 dict(sym="⑰", ctl="PrecinctScreenController", dossier="police", chemin="Plus → LE COMMISSARIAT",
      cadres=[(S6, list(range(31, 36)))], nominal=(S6, 32), planche="planche_le_commissariat_1080x2400.png",
      confiance="déduite", note="partage les cadres 31-35 avec ⑮ ; canon police/commissariat-canon.png"),
 dict(sym="⑭", ctl="CompressionScreenController", dossier="compression", chemin="Plus → LA SEMAINE",
      cadres=[(S4, list(range(25, 31))), (S6, list(range(14, 20)))], nominal=(S4, 25), planche="planche_la_semaine_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite série 4 cadres 25-30 (non ratifiée au 02/09)"),
 dict(sym="㊴", ctl="ForensicScreenController", dossier="screen_b7", chemin="Plus → LE DOSSIER",
      cadres=[(S6, list(range(131, 137)))], nominal=(S6, 131), planche="screen_b7_dossier_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadres 131-136 « Le dossier » par le titre"),
 dict(sym="㊳", ctl="JournalScreenController", dossier="screen_c1", chemin="Plus → LE JOURNAL & LA RUE",
      cadres=[(S6, list(range(125, 131)))], nominal=(S6, 125), planche="screen_c1_journal_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite les cadres 125 et 129"),
 dict(sym="㊵", ctl="FiliereScreenController", dossier="screen_c2", chemin="Plus → LA FILIÈRE",
      cadres=[(S6, list(range(137, 143)))], nominal=(S6, 137), planche="screen_c2_filiere_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite le cadre 142 (« ce qui manque encore »)"),
 dict(sym="㉕", ctl="TutorialScreenController", dossier="compte", chemin="Plus → LA PREMIÈRE FOIS",
      cadres=[], nominal=None, planche="planche_la_premiere_fois_1080x2400.png",
      confiance="aucune", note="canon compte/tutoriel-canon.png ; aucun cadre de série 4/6 identifié"),
 dict(sym="㉒", ctl="ProfileScreenController", dossier="compte", chemin="Plus → VOTRE PROFIL",
      cadres=[(S6, [95, 96, 97])], nominal=(S6, 95), planche="planche_le_coffre_1080x2400.png",
      confiance="déduite", note="déduit par titre (95-97 « Le compte ») — le contrôleur dit « cadres 45-47 », autre numérotation ; canon compte/profil-canon.png ; ⚠️ sa planche s'appelle planche_le_coffre"),
 dict(sym="⑲", ctl="SettingsScreenController", dossier="compte", chemin="Plus → LES RÉGLAGES",
      cadres=[], nominal=None, planche="planche_les_reglages_1080x2400.png",
      confiance="aucune", note="canon compte/reglages-canon.png ; aucun cadre de série 4/6 identifié"),
 dict(sym="㊱", ctl="HorizonScreenController", dossier="screen_c6", chemin="Plus → L'HORIZON DES POSSIBLES",
      cadres=[(S6, list(range(113, 119)))], nominal=(S6, 113), planche="screen_c6_horizon_etat-vide_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadres 113-118 « L'horizon » par le titre ; liste vide par construction sur le compte de démo"),
 dict(sym="㉜", ctl="DelegationScreenController", dossier="ecran_delegation", chemin="Plus → CE QUE VOUS AVEZ CONFIÉ",
      cadres=[(S6, list(range(73, 79)))], nominal=(S6, 73), planche="planche_ce_que_vous_avez_confie_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-73..78"),
 dict(sym="㉚", ctl="ChaineDApproScreenController", dossier="ecran_appro", chemin="Plus → LA CHAÎNE D'APPRO",
      cadres=[(S6, list(range(48, 54)))], nominal=(S6, 48), planche="planche_la_chaine_d_appro_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-48 (repos) .. m-53 (délégué)"),
 dict(sym="㉘", ctl="DistributionScreenController", dossier="ecran_distribution", chemin="Plus → LA DISTRIBUTION",
      cadres=[(S6, list(range(54, 59)))], nominal=(S6, 54), planche="planche_la_distribution_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-54 (repos) .. m-58"),
 dict(sym="㉛", ctl="LoiScreenController", dossier="ecran_loi", chemin="Plus → LA LOI",
      cadres=[(S6, list(range(67, 73)))], nominal=(S6, 67), planche="planche_la_loi_1080x2400.png",
      confiance="déduite", note="cadres 67-72 (le parloir, l'avocat) par le titre"),
 dict(sym="㉝", ctl="DemolitionScreenController", dossier="ecran_demolition", chemin="Plus → RASER UN SITE",
      cadres=[(S6, list(range(79, 85)))], nominal=(S6, 80), planche="planche_raser_un_site_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite m-79..84 ; nominal = 80 « Ce bâtiment vous coûte »"),
 dict(sym="㉞", ctl="CarnetScreenController", dossier="carnet", chemin="Plus → LES ORDRES DU SOIR",
      cadres=[(S6, list(range(85, 92)))], nominal=(S6, 85), planche="planche_signer_l_ordre_1080x2400.png",
      confiance="déduite", note="cadres 85-91 (ordres du soir, rejouer, ce qui arrive) par le titre ; nom de planche à confirmer"),
 dict(sym="㉙", ctl="ConflitScreenController", dossier="ecran_conflit", chemin="Plus → LE CONFLIT",
      cadres=[(S6, list(range(59, 67)))], nominal=(S6, 59), planche="planche_le_conflit_1080x2400.png",
      confiance="déduite", note="cadres 59-66 (la table du fond) par le titre ; rivaux en noms de fiction NON servis (§C-2)"),
]
# Écrans que le shell ne monte PAS lui-même mais qui existent (montés par un autre locataire) —
# une ligne chacun, pour que le juge les trouve aussi.
HORS_APPSHELL = [
 dict(sym="①", ctl="DistrictInteriorScreenController", dossier="ecran-principal", chemin="depuis la carte : ENTRER dans le quartier",
      cadres=[("hud-brennar.html", ["le HUD de Brennar"])], nominal=None, planche="screen_1_district_sous_chrome_1080x2400.png",
      confiance="mesurée", note="hors canon (front.md ①) ; canon ecran-principal/ecran-canon.png + mesure-canon.txt"),
 dict(sym="②", ctl="BuildingCardController", dossier="fiche-batiment", chemin="depuis l'intérieur de district : toucher un bâtiment",
      cadres=[], nominal=None, planche="screen_2a_fiche_sous_chrome_1080x2400.png",
      confiance="aucune", note="dossier juge-donnees existant, aucun dossier juge-visuel ; cadres labo/serre/ash (S6 36-47, 92-94) = variantes par type, non rattachées"),
 dict(sym="⑨", ctl="ExceptionQueueController", dossier="exceptions", chemin="Accueil → la file d'exceptions",
      cadres=[(S4, [14, 16, 17, 18]), (S6, [9, 11, 12, 13])], nominal=(S4, 14), planche="screen_5_exceptions_sous_chrome_1080x2400.png",
      confiance="mesurée", note="le contrôleur cite série 4 cadre 14, ratifié (« ok c'est bien », 2026-08-26)"),
 dict(sym="⑩", ctl="ExceptionDetailController", dossier="exceptions", chemin="depuis la file : une exception",
      cadres=[(S4, [15]), (S6, [10])], nominal=(S4, 15), planche="screen_5a_detail_main-de-cartes_sous_chrome_1080x2400.png",
      confiance="déduite", note="cadre 15 « Exception — sa main » par le titre"),
 dict(sym="㉔", ctl="AutonomyInboxController", dossier="autonomie", chemin="Accueil → rapports d'autonomie",
      cadres=[(S6, list(range(25, 31)))], nominal=(S6, 25), planche="planche_l_autonomie_1080x2400.png",
      confiance="déduite", note="cadres 25-30 « Autonomie » (le burner) par le titre"),
 dict(sym="⑬", ctl="CueStack (sections)", dossier="pile-du-jour", chemin="depuis une exception résolue",
      cadres=[(S4, list(range(19, 25)))], nominal=(S4, 19), planche="",
      confiance="déduite", note="série 4 cadres 19-24 « Pile du jour » ; canon pile-du-jour/v4-19..24.png"),
 dict(sym="⑳", ctl="Recruitment (sections)", dossier="recrutement", chemin="Famille → recruter",
      cadres=[(S4, list(range(9, 14)))], nominal=(S4, 9), planche="",
      confiance="déduite", note="série 4 cadres 9-13 « Recrutement » ; canon recrutement/v4-9..13.png"),
 dict(sym="㉑", ctl="Market (non monté)", dossier="marche", chemin="—",
      cadres=[(S6, list(range(101, 107)))], nominal=(S6, 101), planche="",
      confiance="déduite", note="cadres 101-106 (le tableau) ; écran bloqué (front.md) ; la colonne des quartiers tronque les noms longs (§DA-2)"),
 dict(sym="⑱", ctl="AppShell.MonterMenuPlus", dossier="plus", chemin="onglet PLUS",
      cadres=[(S6, [20, 21])], nominal=(S6, 20), planche="", confiance="mesurée",
      note="cadres 20-21 « Le Bureau du patron » = le menu Plus (front.md:1567, série 6 v3.3) ; canon plus/ecran-canon.png ; le menu, pas un locataire"),
]


def montages_appshell():
    src = open(os.path.join(CLIENT, "Assets/Scripts/Shell/AppShell.cs"), encoding="utf-8").read()
    return sorted(set(re.findall(r"(?:MountTenant|MonterLocataireEnSurimpression)<([A-Za-z]+Controller)>\(\)", src)))


def front_md():
    """symbole → (id canon, nom, état de l'en-tête, puce « Montre »)."""
    out = {}
    lignes = open(os.path.join(BACK, "front.md"), encoding="utf-8").read().split("\n")
    for i, l in enumerate(lignes):
        m = re.match(r"^### ([①-㊿])\s*(`[^`]+`)?\s*[—–-]?\s*\*\*(.+?)\*\*(.*)$", l)
        if not m:
            continue
        montre = ""
        for l2 in lignes[i + 1:i + 40]:
            if l2.startswith("- **Montre**"):
                montre = re.sub(r"\s+", " ", l2[len("- **Montre** :"):]).strip()[:220]
                break
            if l2.startswith("### "):
                break
        out[m.group(1)] = dict(id=(m.group(2) or "").strip("`"), nom=m.group(3).strip(), reste=m.group(4).strip()[:120], montre=montre)
    return out


def routes_du_controleur(ctl):
    chemin = subprocess.run(["grep", "-rl", f"class {ctl}\\b", os.path.join(CLIENT, "Assets/Scripts"), "--include=*.cs"],
                            capture_output=True, text=True).stdout.split()
    if not chemin:
        return [], ""
    # les routes vivent souvent dans le CLIENT voisin (`XClient.cs`) : on lit tout le dossier du contrôleur
    dossier = os.path.dirname(chemin[0])
    src = "".join(open(os.path.join(dossier, f), encoding="utf-8").read() for f in sorted(os.listdir(dossier)) if f.endswith(".cs"))
    routes = sorted(set(re.findall(r'"(/v1/[^"{]+)', src)) | set(re.findall(r'\$"(/v1/[^"]+)"', src)))
    return routes, os.path.relpath(dossier, CLIENT) + "/*.cs"


def sha_atelier():
    return subprocess.run(["git", "-C", ATELIER, "rev-parse", "--short", "HEAD"], capture_output=True, text=True).stdout.strip()


def rendre_reference(page, idx, sortie):
    r = subprocess.run([sys.executable, os.path.join(CLIENT, "Tools/rendre-tel.py"), os.path.join(ATELIER, page), str(idx), sortie, str(ECHELLE)],
                       capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit(f"rendu {page}#{idx} → {sortie} : {r.stdout[-300:]}{r.stderr[-300:]}")
    from PIL import Image
    w, h = Image.open(sortie).size
    if (w, h) != (1080, 2102):
        raise SystemExit(f"référence {sortie} : {w}×{h} ≠ 1080×2102")
    return w, h


MANDAT = """# Mandat pré-rempli — {sym} {nom} — dossier `{dossier}`

> Généré par `Tools/juge-visuel/construire-dossiers.py` le {date} (§DA-3). Le juge lit ceci, puis
> `.claude/skills/juge-visuel/mandat-juge.md` (dépôt back) qui est LA méthode. Tout ce qui est marqué
> « pré-rempli » vient d'une lecture mécanique (front.md, AppShell.cs, le contrôleur) : à confronter
> à l'image, jamais à croire sur parole.

## L'écran
- **Nom** : {nom} ({sym}, canon `{id}`) — contrôleur `{ctl}`
- **Ce qu'on vient y faire** (pré-rempli, front.md « Montre ») : {montre}
- **Chemin joueur pour y arriver** : {chemin}
- **Routes lues dans le contrôleur** : {routes}
- **État `front.md`** (en-tête) : {etat}

## Référence (fait autorité : l'IMAGE)
| fichier | rôle | taille px | facteur | largeur CSS ↔ largeur Unity |
|---|---|---|---|---|
{ref_table}
- **Cadres de la maquette** : {cadres} — atelier `{sha}`. Cadres d'ÉTATS : les autres numéros du groupe.
- **Attribution cadre ↔ écran** : {confiance}. {note}
- ⚠️ La référence fait **1080×2102** (le `.tel` de l'atelier est en 9:17,5) ; la capture fait 1080×2400
  (9:20). On aligne par PARTIES, en % de la largeur — pas par le pixel absolu.
- Polices : le rendu passe par Chrome sur cette machine (`fc-match Georgia` → Noto Serif, `fc-match
  sans-serif` → Noto Sans) ; le client embarque DejaVu. Un écart de FAMILLE est un arbitrage.

## Captures en jeu attendues
- `Assets/Screenshots/{planche}` — {planche_etat}. Une capture est une mesure DATÉE : la reprendre APRÈS
  le dernier correctif, sur `main` du jour, et écrire son SHA ici.

## Ordre de lecture et identité (à écrire par le juge sur la référence SEULE — mandat §0)
- 1ʳᵉ chose que l'œil rencontre : <non pré-rempli : c'est le travail du juge>
- traits d'identité (3 à 5) : <idem>

## Ce que ce dossier ne fournit pas
- aucune capture prise pour ce mandat ; aucun rapport précédent lu ; pas de 2ᵉ résolution.
"""


def main(argv):
    controle = "--controle" in argv
    sans_rendu = "--sans-rendu" in argv
    import datetime
    date = datetime.date.today().isoformat()
    montes = montages_appshell()
    table = {r["ctl"]: r for r in TABLE}
    manquants = [c for c in montes if c not in table]
    if manquants:
        raise SystemExit(f"⛔ contrôleurs montés par AppShell sans ligne dans la table : {manquants}")
    fm = front_md()
    sha = sha_atelier()
    lignes = ["# INDEX — écran → dossier de juge → cadres (généré, `construire-dossiers.py`, %s)" % date, "",
              "Un juge à contexte vierge part d'ici. `dossier` est sous `Tools/juge-visuel/` ; `référence` = le cadre nominal rendu à "
              "×3,6 (1080×2102, anti-crop vérifié) ; `cadres` = page de l'atelier + numéros (index 0-based = numéro du cadre) au SHA atelier `%s`. "
              "`confiance` dit comment le rattachement cadre ↔ écran a été établi : **mesurée** (le contrôleur ou un dossier cite le cadre), "
              "**déduite** (par le titre du cadre), **aucune** (pas de maquette de série 4/6 — une ligne est une ligne, pas une absence)." % sha, "",
              "| sym | écran (front.md) | contrôleur | dossier | cadres | référence | planche en jeu | état front.md | confiance |",
              "|---|---|---|---|---|---|---|---|---|"]
    for r in TABLE + HORS_APPSHELL:
        f = fm.get(r["sym"], {})
        cad = " · ".join(f"`{p}` {', '.join(map(str, ix))}" for p, ix in r["cadres"]) or "aucune maquette de série 4/6"
        nb = sum(1 for x in TABLE + HORS_APPSHELL if x["dossier"] == r["dossier"])
        ref = (f"`{r['dossier']}/reference-{r['sym'] + '-' if nb > 1 else ''}1080x2102.png`") if r["nominal"] else "—"
        planche = r["planche"]
        pe = ("existe" if planche and os.path.exists(os.path.join(CLIENT, "Assets/Screenshots", planche)) else ("ABSENTE" if planche else "—"))
        lignes.append(f"| {r['sym']} | {f.get('nom', '?')} `{f.get('id', '')}` | `{r['ctl']}` | `{r['dossier']}` | {cad} | {ref} | `{planche}` ({pe}) | {f.get('reste', '') or '—'} | {r['confiance']} |")
    lignes += ["", f"Montés par `AppShell.cs` : {len(montes)} contrôleurs distincts ({', '.join(montes)}) — tous indexés (garde du script). "
               f"Lignes hors AppShell : {len(HORS_APPSHELL)}."]
    index = "\n".join(lignes) + "\n"
    if controle:
        print(index)
        return 0
    open(os.path.join(JV, "INDEX.md"), "w", encoding="utf-8").write(index)
    partages = {}
    for r in TABLE + HORS_APPSHELL:
        partages[r["dossier"]] = partages.get(r["dossier"], 0) + 1
    n_ref = 0
    for r in TABLE + HORS_APPSHELL:
        d = os.path.join(JV, r["dossier"]); os.makedirs(d, exist_ok=True)
        f = fm.get(r["sym"], {})
        ref_rows = []
        if r["nominal"]:
            page, idx = r["nominal"]
            sortie = os.path.join(d, "reference-1080x2102.png")
            if partages[r["dossier"]] > 1:   # dossier partagé par plusieurs écrans : un fichier par symbole
                sortie = os.path.join(d, f"reference-{r['sym']}-1080x2102.png")
            if not sans_rendu:
                w, h = rendre_reference(page, idx, sortie); n_ref += 1
            elif os.path.exists(sortie):
                from PIL import Image
                w, h = Image.open(sortie).size
            else:
                raise SystemExit(f"--sans-rendu mais {sortie} n'existe pas")
            ref_rows.append(f"| `{os.path.relpath(sortie, JV)}` | cadre nominal `{page}` #{idx} rendu | {w}×{h} | ×{ECHELLE} | 300 CSS = 1080 px |")
        for canon in sorted(os.listdir(d)):
            if canon.endswith("-canon.png") or canon.startswith("ecran-canon"):
                ref_rows.append(f"| `{r['dossier']}/{canon}` | canon existant (900×1752, ×3) | — | ×3 | 300 CSS = 900 px |")
        routes, fichier = routes_du_controleur(r["ctl"])
        planche_etat = "existe" if r["planche"] and os.path.exists(os.path.join(CLIENT, "Assets/Screenshots", r["planche"])) else "ABSENTE — à capturer"
        mandat = MANDAT.format(sym=r["sym"], nom=f.get("nom", "?"), dossier=r["dossier"], date=date, id=f.get("id") or "sans id canon (écran neuf)", ctl=r["ctl"],
                               montre=f.get("montre") or "non fourni (front.md ne porte pas de puce « Montre » pour cet écran)",
                               chemin=r["chemin"], routes=(", ".join(f"`{x}`" for x in routes) or "aucune chaîne `/v1/` dans le dossier du contrôleur (les routes vivent dans un client partagé ailleurs — voir juge-donnees)") + (f" (`{fichier}`)" if fichier else ""),
                               etat=f.get("reste") or "—", ref_table="\n".join(ref_rows) or "| — | aucune référence rendue (aucune maquette de série 4/6) | — | — | — |",
                               cadres=" · ".join(f"`{p}` {', '.join(map(str, ix))}" for p, ix in r["cadres"]) or "aucune", sha=sha,
                               confiance=r["confiance"], note=r["note"], planche=r["planche"] or "—", planche_etat=planche_etat)
        nom_mandat = "mandat.md" if partages[r["dossier"]] == 1 else f"mandat-{r['sym']}.md"
        open(os.path.join(d, nom_mandat), "w", encoding="utf-8").write(mandat)
    print(f"INDEX.md : {len(TABLE) + len(HORS_APPSHELL)} lignes · références rendues : {n_ref} · mandats : {len(TABLE) + len(HORS_APPSHELL)}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv))
