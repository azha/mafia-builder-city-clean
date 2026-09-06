#!/usr/bin/env python3
"""Génération d'images picturales via fal.ai (queue HTTPS, sans SDK).

Pourquoi ce script et pas `generate_image` du MCP : le package unity-mcp du client est en 9.7.1 et
n'a AUCUN code C# de génération d'image (mesuré 2026-09-06 : 0 fichier, contrôle positif
`ManageEditor` = 1) ; le serveur `uvx` 10.1.0 délègue l'appel au C# 10.x. TD-391 disait « il ne
manque que la clé » — il manquait aussi une montée de package. Ici : `requests` nu.

Clé : `~/.config/fal/key` (600, hors dépôt), ou `FAL_KEY`. Jamais dans un argument de ligne de
commande (elle finirait dans l'historique du shell).

Chaque image sortie porte un sidecar `<nom>.fal.json` (modèle, prompt, seed, taille, request_id,
coût estimé) — une image sans sa provenance n'est pas reproductible, donc pas corrigeable.

usage :
  generer.py --modele fal-ai/flux/dev --prompt-fichier p.txt --largeur 1024 --hauteur 1024 \
             --seed 7 --sortie out/piece.png [--etapes 28] [--guidance 3.5]
"""
import argparse, json, os, sys, time, urllib.request, urllib.error
from pathlib import Path

QUEUE = "https://queue.fal.run"
# $/mégapixel arrondi au MP supérieur (fal.ai/models/fal-ai/flux/dev, lu le 2026-09-06)
COUT_PAR_MP = {"fal-ai/flux/dev": 0.025, "fal-ai/flux/schnell": 0.003}


def cle() -> str:
    k = os.environ.get("FAL_KEY") or Path.home().joinpath(".config/fal/key").read_text().strip()
    if ":" not in k:
        sys.exit("clé fal invalide (forme attendue id:secret)")
    return k


def appel(methode: str, url: str, corps: dict | None, k: str) -> dict:
    data = json.dumps(corps).encode() if corps is not None else None
    req = urllib.request.Request(url, data=data, method=methode,
                                 headers={"Authorization": f"Key {k}", "Content-Type": "application/json"})
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        sys.exit(f"HTTP {e.code} sur {methode} {url} : {e.read().decode()[:600]}")


def base_modele(modele: str) -> str:
    # `fal-ai/flux/dev` → les routes de requête vivent sous `fal-ai/flux`
    parts = modele.split("/")
    return "/".join(parts[:2]) if len(parts) > 2 else modele


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--modele", default="fal-ai/flux/dev")
    p.add_argument("--prompt-fichier", required=True)
    p.add_argument("--largeur", type=int, default=1024)
    p.add_argument("--hauteur", type=int, default=1024)
    p.add_argument("--seed", type=int, default=None)
    p.add_argument("--etapes", type=int, default=28)
    p.add_argument("--guidance", type=float, default=3.5)
    p.add_argument("--sortie", required=True)
    a = p.parse_args()

    prompt = Path(a.prompt_fichier).read_text().strip()
    k = cle()
    corps = {
        "prompt": prompt,
        "image_size": {"width": a.largeur, "height": a.hauteur},
        "num_inference_steps": a.etapes,
        "guidance_scale": a.guidance,
        "num_images": 1,
        "output_format": "png",
        "enable_safety_checker": False,
    }
    if a.seed is not None:
        corps["seed"] = a.seed

    t0 = time.time()
    sub = appel("POST", f"{QUEUE}/{a.modele}", corps, k)
    rid = sub["request_id"]
    statut_url = f"{QUEUE}/{base_modele(a.modele)}/requests/{rid}/status"
    resultat_url = f"{QUEUE}/{base_modele(a.modele)}/requests/{rid}"
    while True:
        st = appel("GET", statut_url, None, k)
        if st.get("status") == "COMPLETED":
            break
        if st.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
            sys.exit(f"statut inattendu : {st}")
        time.sleep(1.5)
    res = appel("GET", resultat_url, None, k)
    img = res["images"][0]
    with urllib.request.urlopen(img["url"], timeout=120) as r:
        octets = r.read()
    out = Path(a.sortie)
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_bytes(octets)

    # 1 MP = 1024×1024 chez fal ; arrondi au MP supérieur
    mp = max(1, -(-(img.get("width", a.largeur) * img.get("height", a.hauteur)) // 1_048_576))
    cout = mp * COUT_PAR_MP.get(a.modele, float("nan"))
    sidecar = {
        "modele": a.modele, "prompt": prompt, "seed": res.get("seed", a.seed),
        "largeur": img.get("width"), "hauteur": img.get("height"),
        "etapes": a.etapes, "guidance": a.guidance, "request_id": rid,
        "duree_s": round(time.time() - t0, 1), "cout_usd_estime": cout,
        "genere_le": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
    }
    out.with_suffix(".fal.json").write_text(json.dumps(sidecar, ensure_ascii=False, indent=2) + "\n")
    print(f"{out} {sidecar['largeur']}x{sidecar['hauteur']} seed={sidecar['seed']} "
          f"{sidecar['duree_s']}s ~{cout:.3f}$ ({len(octets)} o)")


if __name__ == "__main__":
    main()
