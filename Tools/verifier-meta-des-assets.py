#!/usr/bin/env python3
"""Un asset SUIVI par git doit porter son `.meta` DANS LE MÊME COMMIT.

⛔ POURQUOI CET OUTIL EXISTE — mesuré le 2026-09-02, et le coût était réel :
`Assets/Scripts/Operational/LargeurDeGlyphe.cs` a été commité SANS son `.meta`
(Unity ne le génère qu'à l'IMPORT, donc un fichier créé hors éditeur n'en a pas
encore). Le `.meta` est arrivé DEUX COMMITS plus tard. Entre les deux, une autre
session a mergé — et Unity, ne trouvant pas de `.meta`, en a fabriqué un avec un
GUID neuf de son côté. Résultat : **onze conflits de GUID**, un par machine.

★ ET LE PIRE N'EST PAS L'OUBLI, C'EST QUE JE L'AVAIS ÉCRIT. Le message du commit
  fautif disait « dette connue, à commiter au run suivant ». Déclarer la dette
  m'a mis à l'aise avec elle : une dette annoncée ressemble à une dette tenue.
  *Un `.meta` manquant n'est pas une écriture à reporter, c'est un générateur de
  divergence dès le premier merge de quelqu'un d'autre.* Il n'y a pas de « run
  suivant » assez proche pour être sûr d'arriver avant un merge.

⇒ La règle qui en découle : un asset et son `.meta` partent ENSEMBLE, ou aucun
  des deux ne part. Si l'éditeur n'a pas encore tourné, on attend le run — on ne
  commite pas l'asset seul en promettant de compléter.

Usage :
    python3 Tools/verifier-meta-des-assets.py           # l'index git (ce qui est suivi)
    python3 Tools/verifier-meta-des-assets.py --staged  # ce qu'on s'apprête à commiter

Sort 1 s'il manque un `.meta`. Utilisable tel quel avant un commit.
"""
import subprocess
import sys
from pathlib import Path

RACINE = Path(__file__).resolve().parent.parent

# Unity ne génère PAS de `.meta` pour ces noms — les exiger rendrait un rouge permanent,
# et un instrument qui crie toujours finit par ne plus être lu.
IGNORES = {".DS_Store", "Thumbs.db"}


def suivis(staged: bool) -> set[str]:
    if staged:
        cmd = ["git", "diff", "--cached", "--name-only", "--diff-filter=ACR", "--", "Assets"]
    else:
        cmd = ["git", "ls-files", "Assets"]
    sortie = subprocess.run(cmd, cwd=RACINE, capture_output=True, text=True).stdout
    return {l for l in sortie.split("\n") if l}


def main() -> int:
    staged = "--staged" in sys.argv
    listes = suivis(staged)
    if not listes:
        # ⚠️ ANTI-VACUITÉ : rien à vérifier et « tout va bien » ont la même sortie sinon.
        # C'est le mode d'échec de tous les instruments de ce dépôt — vert pour n'avoir
        # rien regardé.
        print("aucun fichier d'Assets dans le périmètre — RIEN n'a été vérifié"
              + (" (--staged : rien d'ajouté à l'index ?)" if staged else ""))
        return 0

    # En mode --staged, le `.meta` peut être DÉJÀ suivi sans être re-ajouté : on regarde
    # donc l'index complet pour décider s'il existe, pas seulement ce qui est mis en scène.
    connus = listes | (suivis(False) if staged else set())

    manquants = sorted(
        f for f in listes
        if not f.endswith(".meta")
        and Path(f).name not in IGNORES
        and f + ".meta" not in connus
    )

    if manquants:
        print(f"⛔ {len(manquants)} asset(s) SANS leur `.meta` :")
        for m in manquants:
            print(f"    {m}")
        print("\n⚠️ Ne PAS commiter en promettant de compléter au run suivant : entre les deux,")
        print("   un merge d'une autre session fabrique un GUID différent par machine.")
        print("   Lancer Unity une fois, puis commiter l'asset ET son `.meta` ENSEMBLE.")
        return 1

    print(f"✓ {len([f for f in listes if not f.endswith('.meta')])} asset(s) vérifié(s), "
          "chacun porte son `.meta`")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
