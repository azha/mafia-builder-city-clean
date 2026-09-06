#!/usr/bin/env python3
"""Détourage (matte alpha) d'une image via fal.ai `fal-ai/birefnet` — même clé, même file d'attente,
même règle de sauvegarde que `generer.py` : chaque sortie va dans `generees/<date>/<slug>-<n>.png` avec
son sidecar. Pourquoi un modèle et pas un seuil : un masque « pixels ≠ ciel » a livré le 2026-09-06 un
avant-plan à trous (conteneurs sombres confondus avec la nuit) qui passait le plancher anti-vacuité à
3,8 % — présent, aux bonnes couleurs, et le mauvais dessin.

usage : detourer.py <image.png> --slug <slug>
"""
import argparse, base64, json, sys, time, urllib.request
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from generer import QUEUE, appel, base_modele, chemin_sortie, cle  # noqa: E402

MODELE = "fal-ai/birefnet"


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("image")
    p.add_argument("--slug", required=True)
    a = p.parse_args()
    octets_in = Path(a.image).read_bytes()
    out = chemin_sortie(a.slug, None)
    k = cle()
    corps = {"image_url": "data:image/png;base64," + base64.b64encode(octets_in).decode(),
             "model": "General Use (Heavy)", "operating_resolution": "1024x1024", "output_format": "png", "refine_foreground": True}
    t0 = time.time()
    rid = appel("POST", f"{QUEUE}/{MODELE}", corps, k)["request_id"]
    st_url = f"{QUEUE}/{base_modele(MODELE)}/requests/{rid}/status"
    while True:
        st = appel("GET", st_url, None, k)
        if st.get("status") == "COMPLETED":
            break
        if st.get("status") not in ("IN_QUEUE", "IN_PROGRESS"):
            sys.exit(f"statut inattendu : {st}")
        time.sleep(1.5)
    res = appel("GET", f"{QUEUE}/{base_modele(MODELE)}/requests/{rid}", None, k)
    img = res["image"]
    with urllib.request.urlopen(img["url"], timeout=120) as r:
        octets = r.read()
    out.write_bytes(octets)
    side = {"modele": MODELE, "source": str(a.image), "parametres": {x: corps[x] for x in corps if x != "image_url"},
            "largeur": img.get("width"), "hauteur": img.get("height"), "request_id": rid,
            "duree_s": round(time.time() - t0, 1), "genere_le": time.strftime("%Y-%m-%dT%H:%M:%S%z")}
    out.with_suffix(".fal.json").write_text(json.dumps(side, ensure_ascii=False, indent=2) + "\n")
    print(f"{out} {side['largeur']}x{side['hauteur']} {side['duree_s']}s ({len(octets)} o)")


if __name__ == "__main__":
    main()
