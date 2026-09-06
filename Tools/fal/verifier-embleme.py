#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""L'emblème demandé a-t-il été RENDU ? — la garde de la campagne de portraits.

Pourquoi elle existe : sous la clé d'attribution par NOM, le métier vit sur l'insigne et l'emblème
**personnel** est le seul dispositif d'identité de l'image. Un portrait dont l'emblème n'a pas été
rendu n'est pas « un peu moins bon », il est **sans identité** — et 74 comme lui font un casting de
visages interchangeables. Mesuré le 2026-09-06 : le chef rival demandait une canule de trachéotomie et
une cicatrice à la gorge, l'image n'en porte rien, et rien ne l'a signalé.

⛔ **Première version, fausse, gardée ici parce qu'elle est instructive.** Elle comparait l'image à un
témoin généré à la MÊME GRAINE avec le prompt privé de sa clause d'emblème, et déclarait l'emblème
rendu si la zone de la gorge divergeait. Elle a rendu **22,56 ⇒ « EMBLÈME RENDU »** sur le cas même qui
l'avait motivée. Vérifié en recadrant les deux gorges côte à côte : **aucune canule, aucune cicatrice**
dans l'une ni dans l'autre — toute la divergence venait de la **cravate**, passée de bordeaux à noire
parce qu'on avait retiré treize mots du prompt. La sonde mesurait « le prompt a changé l'image », pas
« l'emblème est là » : une tautologie de la sensibilité au prompt. *Aucune mesure de pixels ne sait
dire « ceci est une canule ».*

⇒ La version qui marche pose la question à un modèle de VISION (`fal-ai/moondream2/visual-query`,
réponse observée : `{"output": "no"}` sur ce cas exact), avec ses deux contrôles **exécutés à chaque
appel** :
  · **positif** — la même question posée sur une image dont on SAIT que l'objet y est (le masque à gaz
    du cuisinier) doit répondre *oui* ; sinon la sonde dirait *non* à tout et le lot entier serait
    rejeté sans raison ;
  · **négatif** — une question sur un objet dont on SAIT qu'il est absent doit répondre *non* ; sinon
    la sonde dirait *oui* à tout, et c'est le mode d'échec qui coûte 74 portraits.

usage : verifier-embleme.py <image.png> "<question fermée sur l'emblème>"
"""
import base64
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from generer import QUEUE, appel, cle  # noqa: E402

MODELE = "fal-ai/moondream2/visual-query"
BASE = "fal-ai/moondream2"
RACINE = Path(__file__).resolve().parent / "generees/2026-09-06"
CONTROLE_POSITIF = (RACINE / "portrait-cook4-s1-1.png",
                    "Is the man wearing a respirator or gas mask over his face? Answer only yes or no.")
CONTROLE_NEGATIF = (RACINE / "nap-titulaire-1.png",
                    "Is the man wearing a respirator or gas mask over his face? Answer only yes or no.")


def demander(chemin: Path, question: str, k: str) -> str:
    img = "data:image/png;base64," + base64.b64encode(Path(chemin).read_bytes()).decode()
    rid = appel("POST", f"{QUEUE}/{MODELE}", {"image_url": img, "prompt": question}, k)["request_id"]
    for _ in range(60):
        st = appel("GET", f"{QUEUE}/{BASE}/requests/{rid}/status", None, k)
        if st.get("status") == "COMPLETED":
            break
        if st.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
            sys.exit(f"statut inattendu : {st}")
        time.sleep(1.5)
    return str(appel("GET", f"{QUEUE}/{BASE}/requests/{rid}", None, k).get("output", "")).strip().lower()


def oui(reponse: str) -> bool:
    return reponse.startswith("y") or reponse.startswith("o")


def main() -> None:
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    image, question = Path(sys.argv[1]), sys.argv[2]
    k = cle()

    pos = demander(*CONTROLE_POSITIF, k)
    if not oui(pos):
        sys.exit(f"contrôle positif RATÉ : un masque à gaz bien visible rend « {pos} » — la sonde ne voit rien")
    neg = demander(*CONTROLE_NEGATIF, k)
    if oui(neg):
        sys.exit(f"contrôle négatif RATÉ : un objet absent rend « {neg} » — la sonde dit oui à tout")

    rep = demander(image, question, k)
    print(f"{image.name}")
    print(f"  contrôle positif (masque à gaz présent)  : « {pos} » ✓")
    print(f"  contrôle négatif (masque à gaz absent)   : « {neg} » ✓")
    print(f"  question posée : {question}")
    print(f"  ⇒ réponse « {rep} » — {'EMBLÈME RENDU' if oui(rep) else '⛔ EMBLÈME NON RENDU, le portrait est sans identité'}")
    sys.exit(0 if oui(rep) else 1)


if __name__ == "__main__":
    main()
