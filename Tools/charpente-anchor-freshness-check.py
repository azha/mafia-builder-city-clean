#!/usr/bin/env python3
"""Charpente items 0.2/0.3/0.3-bis — garde de FRAÎCHEUR des ancres de citation.

CLASSE COUVERTE (revue round 12, BLOQUANT — 5e occurrence, 4 correctifs manuels déjà rouverts) :
une citation par NUMÉRO DE LIGNE vers `AppShell.cs` ou `TopBarController.cs` (les deux fichiers
que CE LOT réédite à chaque round) périme dès que l'un des deux est réédité — y compris DANS LE
MÊME COMMIT qui l'a écrite. Option (a) (round 11) a décidé d'abandonner les numéros pour des noms
de SYMBOLES dans les .cs du lot ; ce script en fait une garde MÉCANIQUE et COMMITÉE plutôt qu'un
geste manuel non instrumenté.

PORTÉE (déclarée, pas implicite) — voir FILE_SCOPE / PROTECTED_BASENAMES ci-dessous :
  - Fichiers balayés : les .cs et .md de ce lot (FILE_SCOPE).
  - Fichiers PROTÉGÉS (ceux dont une citation par numéro peut périmer À CAUSE de ce lot) :
    AppShell.cs, TopBarController.cs.
  - Ce que ce script vérifie : que les LIGNES AJOUTÉES OU MODIFIÉES par le commit en cours (diff
    entre --base et --target, --target par défaut = arbre de travail) ne réintroduisent PAS une
    citation par numéro NON DATÉE vers un fichier protégé, sous aucune des deux formes :
    absolue (`Fichier.cs:123`) ou relative (`` `:123` ``, résolue par proximité — voir résolution
    ci-dessous).
  - Ce que ce script NE vérifie PAS, délibérément : les citations déjà présentes AVANT ce commit,
    non touchées par lui. Auditer l'intégralité de l'historique (des centaines de citations dans
    `notes.md`, dont beaucoup sont légitimement DATÉES par leur propre section "## ROUND N") est un
    problème de désambiguïsation de langage naturel hors de portée d'un script de ~100 lignes.
    ⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, MAJEUR — CLASSE PREUVE) — la justification livrée round
    13 ICI MÊME affirmait « LES 4 OCCURRENCES PASSÉES DE CE DÉFAUT VIVAIENT TOUTES DANS LE TEXTE
    NEUF DU COMMIT QUI PRÉTENDAIT LES FERMER, jamais dans du texte ancien laissé intact » — FAUX,
    et la mesure était déjà dans le round 12 cité par round 13 lui-même : 4 des 6 ancres de son
    BLOQUANT 1 étaient du texte ANCIEN, non touché par le commit qui les a rendues fausses, rendu
    faux PAR LES DÉCALAGES DE LIGNES introduits ailleurs dans le MÊME commit (round 12 l'écrivait
    textuellement : « non touché ce round, invalidé par lui »). La VRAIE raison du scope diff-only
    est plus modeste : couvrir le texte NEUF (ce que ce script fait) coûte ~100 lignes ; couvrir en
    plus le DÉCALAGE d'ancres anciennes par des lignes ajoutées/retirées AILLEURS dans le fichier
    coûterait de reconstruire une correspondance ancien-numéro → nouveau-numéro pour CHAQUE ligne du
    fichier, hors de portée ici. ⇒ CE QUE CE SCRIPT LAISSE OUVERT, EXPLICITEMENT : toute ancre
    ANCIENNE, non touchée par CE diff, mais rendue fausse par un décalage de lignes AILLEURS dans le
    même fichier protégé — c'est EXACTEMENT le mécanisme du BLOQUANT (b)/(c) round 12, et il reste
    un geste humain à chaque round (comme les 12 rounds précédents), PAS mécanisé ici.
    ⚠️ AUTRE LIMITE DÉCLARÉE, distincte de la précédente : une citation dont la CIBLE n'est PAS dans
    `PROTECTED_BASENAMES` (ex. `design.md`, `implementation-notes.md`) n'est JAMAIS vérifiée, même
    si cette cible est elle-même rééditée à chaque round par ce lot — round 12's BLOQUANT (c) était
    exactement une citation vers `design.md:109`/`:146` devenue fausse ; une RÉCURRENCE de ce même
    mécanisme échapperait ENTIÈREMENT à cet instrument aujourd'hui. Étendre `PROTECTED_BASENAMES` à
    ces fichiers est un choix de PORTÉE qui n'a pas été tranché ici (revue ⊥ round 14, MAJEUR 1,
    sous-finding — non trancher un choix d'architecture à la place de l'auteur) : remonté, pas
    deviné.

DATATION — une citation numérique est exemptée si un jeton ressemblant à un SHA git
(`[0-9a-f]{7,40}`) apparaît À PROXIMITÉ (fenêtre de ±DATING_WINDOW_LINES lignes DU FICHIER CIBLE,
PAS du hunk entier) — c'est la forme DÉJÀ établie dans ce dépôt (voir
`CharpenteMontageLocatairesPlayModeTests.cs`, le commentaire "HEAD `fe00b0a`, mesuré au commit du
design" à côté de `` `:211` ``/`` `:375` ``).
⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, MAJEUR — CLASSE PREUVE). La version livrée round 13 datait
contre le HUNK ENTIER (`"\n".join(hunk_lines)`), pas contre une fenêtre de ±2 lignes comme ce
docstring le promettait déjà à l'époque : un SEUL jeton ressemblant à un SHA N'IMPORTE OÙ dans un
hunk de 291 lignes exemptait TOUTES les citations de ce hunk. Mesuré par la revue : 2 candidats
authentiques générés par injection sur le hunk RÉEL de round 13 (`notes.md:3227`/`:3228`) ont été
SILENCIEUSEMENT ÉCARTÉS par ce mécanisme. La fenêtre est maintenant calculée par DISTANCE DE LIGNE
réelle dans le fichier CIBLE (chaque ligne conservée porte son propre numéro), jamais par
appartenance au même hunk.

RÉSOLUTION DE LA FORME RELATIVE (`` `:N` ``) — un `` `:N` `` hérite du DERNIER fichier cité en
forme ABSOLUE sur la MÊME LIGNE (en amont) ou, à défaut, sur une ligne AJOUTÉE précédente DU MÊME
HUNK ; si aucune citation absolue n'a été vue dans le hunk ET que le fichier diffé lui-même est un
fichier PROTÉGÉ, le `` `:N` `` est traité comme une AUTO-RÉFÉRENCE à ce fichier protégé (c'est
EXACTEMENT le mécanisme des deux ancres neuves round 11 dans `TopBarController.cs` : `` `:570` ``
et `` `:702` ``, sans aucune citation absolue avant elles dans leur hunk).

⚠️ Ce script s'exécute avec `git` via `subprocess` (jamais un pipe shell nu) — évite le piège
documenté dans ce dépôt : une sortie `git diff` proxifiée par le shell interactif escamote des
lignes de contexte tout en gardant l'en-tête de hunk qui les annonce.
"""
import re
import subprocess
import sys

FILE_SCOPE = [
    "Assets/Scripts/Shell/AppShell.cs",
    "Assets/Scripts/Shell/TopBarController.cs",
    "Assets/Tests/PlayMode/ProductionClickSupport.cs",
    "Assets/Tests/PlayMode/CharpenteOuvertureSessionOverlayPlayModeTests.cs",
    "Assets/Tests/PlayMode/CharpenteMontageLocatairesPlayModeTests.cs",
    "Tools/charpente-item0-2-3-design.md",
    "Tools/charpente-item0-2-3-implementation-notes.md",
]

PROTECTED_BASENAMES = {"AppShell.cs", "TopBarController.cs"}

ABS_RE = re.compile(r"([A-Za-z0-9_]+\.(?:cs|md)):(\d+)(?:[-–](\d+))?")
REL_RE = re.compile(r"`:(\d+)(?:[-–](\d+))?`")
SHA_RE = re.compile(r"\b[0-9a-f]{7,40}\b")
HUNK_HEADER_RE = re.compile(r"^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@")

# round 15 (revue ⊥ round 14, MAJEUR) — la fenêtre que le docstring promettait déjà round 13, mais
# que le code n'implémentait pas (il datait contre le HUNK ENTIER). Distance en LIGNES DU FICHIER
# CIBLE, jamais en position dans le hunk.
DATING_WINDOW_LINES = 2


def git_diff(base, target, path):
    """subprocess direct — jamais un pipe/redirection shell (piège documenté du dépôt)."""
    cmd = ["git", "diff", "-U2", base]
    if target:
        cmd.append(target)
    cmd += ["--", path]
    result = subprocess.run(cmd, capture_output=True, text=True, check=True)
    return result.stdout


def scan_diff_text(diff_text, filename_being_diffed):
    """Retourne la liste des violations : (fichier_diffé, ligne_nouvelle, cible, texte, forme)."""
    is_protected_self = filename_being_diffed in PROTECTED_BASENAMES
    violations = []
    lines = diff_text.split("\n")
    new_lineno = None
    last_abs_target = None  # réinitialisé à chaque hunk
    # (numéro_de_ligne_ou_None, texte) pour CHAQUE ligne conservée (ajoutée OU contexte) du hunk
    # courant — le numéro permet une fenêtre de datation par DISTANCE RÉELLE, pas par appartenance
    # au hunk (round 15, revue ⊥ round 14, MAJEUR — voir DATATION ci-dessus).
    hunk_lines = []

    def flush_hunk_dating_and_check(pending):
        for (lineno, target, text, kind) in pending:
            window = "\n".join(
                raw for (ln, raw) in hunk_lines
                if ln is not None and abs(ln - lineno) <= DATING_WINDOW_LINES
            )
            dated = bool(SHA_RE.search(window))
            if target in PROTECTED_BASENAMES and not dated:
                violations.append((filename_being_diffed, lineno, target, text.strip(), kind))

    pending_checks = []

    for raw in lines:
        m = HUNK_HEADER_RE.match(raw)
        if m:
            # nouveau hunk : on clôt le précédent (date les citations en attente contre SON texte)
            flush_hunk_dating_and_check(pending_checks)
            pending_checks = []
            hunk_lines = []
            new_lineno = int(m.group(1))
            last_abs_target = None
            continue
        if raw.startswith("+++") or raw.startswith("---"):
            continue
        if raw.startswith("+"):
            hunk_lines.append((new_lineno, raw))
            content = raw[1:]
            # forme ABSOLUE — traitée en premier, dans l'ordre d'apparition sur la ligne
            abs_matches = list(ABS_RE.finditer(content))
            rel_matches = list(REL_RE.finditer(content))
            # fusionne les deux jeux de matches par position pour respecter l'ordre gauche->droite
            tagged = [(mm.start(), "ABS", mm) for mm in abs_matches] + \
                     [(mm.start(), "REL", mm) for mm in rel_matches]
            tagged.sort(key=lambda t: t[0])
            for _, kind, mm in tagged:
                if kind == "ABS":
                    last_abs_target = mm.group(1)
                    pending_checks.append((new_lineno, mm.group(1), mm.group(0), "absolue"))
                else:
                    if last_abs_target is not None:
                        target = last_abs_target
                    elif is_protected_self:
                        target = filename_being_diffed
                    else:
                        target = None  # aucune cible protégée identifiable — hors périmètre
                    if target is not None:
                        pending_checks.append((new_lineno, target, mm.group(0), "relative"))
            new_lineno += 1
        elif raw.startswith("-"):
            continue  # ligne retirée : ne compte pas dans la numérotation NOUVELLE
        else:
            hunk_lines.append((new_lineno, raw))
            if new_lineno is not None:
                new_lineno += 1

    flush_hunk_dating_and_check(pending_checks)
    return violations


# ─────────────────────────────────────────────────────────────────────────────── CONTRÔLE POSITIF
def self_test():
    """Le contrôle doit lui-même rougir sur un cas injecté — sinon un 0 ne prouve rien (socle
    CLAUDE.md : un `grep -cF` qui rend 0 peut le rendre pour la mauvaise raison, 3 fois payé ici)."""
    # Cas 1 — AUTO-RÉFÉRENCE non datée dans un fichier PROTÉGÉ (le mécanisme EXACT de `:570`/`:702`
    # round 11) : DOIT être détectée.
    diff_bad_self = (
        "@@ -168,0 +169,3 @@\n"
        "+        // cette ligne dit une chose fausse, en contradiction avec `:999`\n"
        "+        // (elle n'existe nulle part, c'est le cas injecté du contrôle positif).\n"
        "+        private GameObject leadingGo;\n"
    )
    v1 = scan_diff_text(diff_bad_self, "TopBarController.cs")
    assert len(v1) == 1 and v1[0][2] == "TopBarController.cs", (
        f"AUTO-TEST ÉCHOUÉ (cas 1, auto-référence non datée) : attendu 1 violation sur "
        f"TopBarController.cs, obtenu {v1}")

    # Cas 2 — même citation, mais DATÉE (SHA dans le hunk) : NE DOIT PAS être détectée.
    diff_good_dated = (
        "@@ -168,0 +169,3 @@\n"
        "+        // AVANT la fusion (HEAD 9c57125cf, mesuré au commit du design) : `:999`\n"
        "+        // décrivait autre chose. APRÈS, le contenu a changé.\n"
        "+        private GameObject leadingGo;\n"
    )
    v2 = scan_diff_text(diff_good_dated, "TopBarController.cs")
    assert len(v2) == 0, f"AUTO-TEST ÉCHOUÉ (cas 2, citation datée) : attendu 0, obtenu {v2}"

    # Cas 3 — citation ABSOLUE non datée vers un fichier PROTÉGÉ, DEPUIS UN AUTRE FICHIER .cs (une
    # citation croisée, PAS une auto-référence) : DOIT être détectée, avec sa forme relative héritée.
    # ⛔⛔ CORRIGÉ round 15 (revue ⊥ round 14, MAJEUR — CLASSE PREUVE) — ce cas se déclarait « le
    # mécanisme des ancres design.md:109/:146 round 11 ». FAUX SUR LES DEUX AXES : (a) la SOURCE
    # diffée ici est un `.cs`, jamais `design.md` ; (b) et surtout, la CIBLE round 11 réelle ÉTAIT
    # `design.md` — un fichier qui n'est PAS dans `PROTECTED_BASENAMES` — alors que ce cas cite
    # `TopBarController.cs`, qui l'EST. Une citation vers `design.md` ne serait JAMAIS détectée par
    # CE script, quel que soit le cas testé ici (voir PORTÉE, § limite déclarée). Ce cas prouve autre
    # chose, réel et utile : l'HÉRITAGE d'une cible ABSOLUE par une forme RELATIVE suivante,
    # FONCTIONNE aussi quand la source diffée n'est PAS le fichier protégé lui-même.
    diff_bad_cross = (
        "@@ -310,0 +311,2 @@\n"
        "+        // rend une FLÈCHE NUE pour cette action (`TopBarController.cs:999`), voir\n"
        "+        // aussi `:1005` pour le détail.\n"
    )
    v3 = scan_diff_text(diff_bad_cross, "CharpenteOuvertureSessionOverlayPlayModeTests.cs")
    assert len(v3) == 2 and all(t[2] == "TopBarController.cs" for t in v3), (
        f"AUTO-TEST ÉCHOUÉ (cas 3, ABS + REL hérité non datés, depuis un AUTRE fichier .cs) : "
        f"attendu 2 violations sur TopBarController.cs (une absolue, une relative héritée), "
        f"obtenu {v3}")

    # Cas 4 — citation vers un fichier NON protégé (ex. EventSystem.cs, package tiers) : NE DOIT
    # JAMAIS être détectée, même non datée, même en forme relative qui la suit.
    diff_out_of_scope = (
        "@@ -95,0 +96,2 @@\n"
        "+        // (`EventSystem.cs:266-281`, package com.unity.ugui) ne consulte QUE\n"
        "+        // `RaycasterManager.GetRaycasters()` ; voir aussi `:290-302`.\n"
    )
    v4 = scan_diff_text(diff_out_of_scope, "ProductionClickSupport.cs")
    assert len(v4) == 0, f"AUTO-TEST ÉCHOUÉ (cas 4, fichier hors périmètre) : attendu 0, obtenu {v4}"

    # Cas 5 (round 15, NOUVEAU — comble PARTIELLEMENT ce que le cas 3 se déclarait couvrir sans le
    # faire) — une citation ABSOLUE non datée vers un fichier PROTÉGÉ, DEPUIS `design.md` LUI-MÊME :
    # DOIT être détectée. Ceci prouve que le mécanisme ne discrimine pas par TYPE de fichier SOURCE
    # (`.md` scanné exactement comme un `.cs`) — mais NE PROUVE PAS, et ne peut PAS prouver, la
    # classe réelle du BLOQUANT (c) round 11 (une citation VERS `design.md`, qui reste HORS DE
    # PORTÉE de ce script tant que `design.md` n'est pas dans `PROTECTED_BASENAMES` — voir PORTÉE).
    diff_from_design_md = (
        "@@ -108,0 +109,2 @@\n"
        "+   `AppShell.cs:999` construit le Canvas ; voir aussi `:1005` pour le détail du flux.\n"
    )
    v5 = scan_diff_text(diff_from_design_md, "charpente-item0-2-3-design.md")
    assert len(v5) == 2 and all(t[2] == "AppShell.cs" for t in v5), (
        f"AUTO-TEST ÉCHOUÉ (cas 5, citation depuis design.md vers un fichier PROTÉGÉ) : attendu "
        f"2 violations sur AppShell.cs, obtenu {v5}")

    print("AUTO-TEST : 5/5 cas conformes (3 détections attendues-et-obtenues, 2 non-détections "
          "attendues-et-obtenues : datée / hors périmètre).")


def main():
    self_test()
    print()
    print("PORTÉE — fichiers balayés :")
    for f in FILE_SCOPE:
        print(f"  - {f}")
    print(f"PORTÉE — fichiers PROTÉGÉS (citation par numéro interdite si non datée) : "
          f"{sorted(PROTECTED_BASENAMES)}")

    base = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
    target = sys.argv[2] if len(sys.argv) > 2 else ""
    print(f"PORTÉE — diff : base={base} target={target or '(arbre de travail)'}")
    print()

    total_violations = []
    for path in FILE_SCOPE:
        basename = path.rsplit("/", 1)[-1]
        try:
            diff_text = git_diff(base, target, path)
        except subprocess.CalledProcessError as e:
            print(f"[ERREUR] git diff a échoué sur {path} : {e.stderr}")
            sys.exit(2)
        if not diff_text.strip():
            print(f"{path} : 0 ligne modifiée dans ce diff.")
            continue
        violations = scan_diff_text(diff_text, basename)
        print(f"{path} : {len(violations)} violation(s) parmi les lignes ajoutées.")
        total_violations.extend(violations)

    print()
    if total_violations:
        print(f"ROUGE — {len(total_violations)} citation(s) par numéro NON DATÉE(S) vers un "
              f"fichier protégé, introduite(s) ou laissée(s) par ce diff :")
        for (f, ln, target, text, kind) in total_violations:
            print(f"  {f}:{ln} [{kind}] cible={target} — {text}")
        sys.exit(1)
    else:
        print("VERT — 0 citation par numéro non datée vers un fichier protégé dans les lignes "
              "touchées par ce diff.")
        sys.exit(0)


if __name__ == "__main__":
    main()
