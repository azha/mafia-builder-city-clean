#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le contrôle qui prouve que la rampe LIT le canon au lieu de recopier ses valeurs.

Pourquoi il existe : le 2026-09-07, `posteriser.py` portait `RAMPE = ["#0f1622", …]` en littéral. La
valeur était juste — mais par le mauvais chemin. Un juge qui compare des pixels aurait dit « conforme »
et une garde qui compte les accès au jeton aurait dit « zéro » : **les deux instruments sont aveugles
au même endroit**, et le défaut ne se trahit que le jour où le jeton bouge dans l'asset.
⚠️ Remplacer le littéral par une lecture ne suffit pas : une lecture qui retomberait silencieusement
sur une valeur codée en dur serait **le même défaut, mieux habillé**. D'où ce contrôle.

Trois assertions, toutes exécutées :
  · **positif** — on change la valeur d'un jeton dans une COPIE de l'asset : la rampe DOIT suivre.
    Si elle ne bouge pas, la lecture est décorative ;
  · **négatif** — un jeton absent (« hudBg », celui qui a traversé 209 portraits) doit être FATAL,
    pas silencieusement remplacé ;
  · **identité** — sur l'asset réel, la rampe résolue vaut ce que le canon porte, jeton par jeton.

usage : controle-rampe-jetons.py
"""
import importlib.util
import json
import subprocess
import sys
import tempfile
from pathlib import Path

R = Path(__file__).resolve().parent
spec = importlib.util.spec_from_file_location("po", R / "posteriser.py")
po = importlib.util.module_from_spec(spec)
spec.loader.exec_module(po)


def main() -> None:
    asset = po.ASSET_PALETTE
    canon = {t["name"]: t["hex"] for t in json.loads(asset.read_text())["tokens"]}

    reelle = po.rampe_du_canon()
    attendue = [canon[n] for n in po.RAMPE_JETONS]
    if reelle != attendue:
        sys.exit(f"IDENTITÉ ROMPUE : {reelle} ≠ {attendue}")

    # positif : on bouge un jeton dans une copie, la rampe doit suivre
    with tempfile.TemporaryDirectory() as d:
        faux = Path(d) / "palette.json"
        data = json.loads(asset.read_text())
        for t in data["tokens"]:
            if t["name"] == po.RAMPE_JETONS[0]:
                t["hex"] = "#ff00ff"
        faux.write_text(json.dumps(data))
        bougee = po.rampe_du_canon(faux)
        if bougee[0] != "#ff00ff":
            sys.exit(f"CONTRÔLE POSITIF RATÉ : le jeton a bougé et la rampe rend {bougee[0]} — "
                     f"la lecture est décorative, une valeur est codée en dur quelque part")

    # négatif : un jeton inventé doit être fatal, pas silencieusement toléré
    code = subprocess.run([sys.executable, "-c",
                           f"import importlib.util,sys;"
                           f"s=importlib.util.spec_from_file_location('po',r'{R / 'posteriser.py'}');"
                           f"m=importlib.util.module_from_spec(s);s.loader.exec_module(m);"
                           f"m.jeton('hudBg')"], capture_output=True).returncode
    if code == 0:
        sys.exit("CONTRÔLE NÉGATIF RATÉ : « hudBg » n'existe pas et n'a pas fait échouer la résolution — "
                 "c'est exactement le trou qui a laissé passer 209 portraits")

    print("rampe lue dans le canon :")
    for n, h in zip(po.RAMPE_JETONS, reelle):
        print(f"  {n:<26} {h}")
    print("  contrôle positif  : jeton déplacé → rampe déplacée ✓")
    print("  contrôle négatif  : jeton inventé « hudBg » → échec fatal ✓")
    print("  identité          : rampe == canon, jeton par jeton ✓")


if __name__ == "__main__":
    main()
