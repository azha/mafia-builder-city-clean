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
    problème de désambiguïsation de langage naturel hors de portée d'un script de ~100 lignes — et
    hors de la classe que ce BLOQUANT nomme : LES 4 OCCURRENCES PASSÉES DE CE DÉFAUT VIVAIENT TOUTES
    DANS LE TEXTE NEUF DU COMMIT QUI PRÉTENDAIT LES FERMER, jamais dans du texte ancien laissé
    intact. Une garde de RÉGRESSION scopée au diff couvre exactement ce mécanisme, avec précision.
    (Le round qui audite l'historique complet reste un geste humain, comme les 12 rounds précédents.)

DATATION — une citation numérique est exemptée si un jeton ressemblant à un SHA git
(`[0-9a-f]{7,40}`) apparaît dans le même hunk, à proximité (fenêtre de ±2 lignes) — c'est la forme
DÉJÀ établie dans ce dépôt (voir `CharpenteMontageLocatairesPlayModeTests.cs`, le commentaire
"HEAD `fe00b0a`, mesuré au commit du design" à côté de `` `:211` ``/`` `:375` ``).

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
    hunk_lines = []  # texte du hunk courant, pour la fenêtre de datation

    def flush_hunk_dating_and_check(pending):
        for (lineno, target, text, kind) in pending:
            window = "\n".join(hunk_lines)
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
            hunk_lines.append(raw)
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
            hunk_lines.append(raw)
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

    # Cas 3 — citation ABSOLUE non datée vers un fichier PROTÉGÉ, depuis un AUTRE fichier (le
    # mécanisme des ancres design.md:109/:146 round 11) : DOIT être détectée.
    diff_bad_cross = (
        "@@ -310,0 +311,2 @@\n"
        "+        // rend une FLÈCHE NUE pour cette action (`TopBarController.cs:999`), voir\n"
        "+        // aussi `:1005` pour le détail.\n"
    )
    v3 = scan_diff_text(diff_bad_cross, "CharpenteOuvertureSessionOverlayPlayModeTests.cs")
    assert len(v3) == 2 and all(t[2] == "TopBarController.cs" for t in v3), (
        f"AUTO-TEST ÉCHOUÉ (cas 3, ABS + REL hérité non datés) : attendu 2 violations sur "
        f"TopBarController.cs (une absolue, une relative héritée), obtenu {v3}")

    # Cas 4 — citation vers un fichier NON protégé (ex. EventSystem.cs, package tiers) : NE DOIT
    # JAMAIS être détectée, même non datée, même en forme relative qui la suit.
    diff_out_of_scope = (
        "@@ -95,0 +96,2 @@\n"
        "+        // (`EventSystem.cs:266-281`, package com.unity.ugui) ne consulte QUE\n"
        "+        // `RaycasterManager.GetRaycasters()` ; voir aussi `:290-302`.\n"
    )
    v4 = scan_diff_text(diff_out_of_scope, "ProductionClickSupport.cs")
    assert len(v4) == 0, f"AUTO-TEST ÉCHOUÉ (cas 4, fichier hors périmètre) : attendu 0, obtenu {v4}"

    print("AUTO-TEST : 4/4 cas conformes (2 détections attendues-et-obtenues, 2 non-détections "
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
