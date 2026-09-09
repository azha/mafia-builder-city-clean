#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Le pool de VISAGES de lieutenants — la variété par CONSTRUCTION, pas par inspiration.

Décidé le 2026-09-06 : le portrait n'est plus attaché au NOM mais à l'**identifiant** du lieutenant.
L'identifiant est plus stable encore (un lieutenant ne change jamais de visage) et il y en a 22 408,
donc le nombre de visages se découple du nombre de noms — le lot back « 24 → 48 noms » sort du chemin
critique.

⚠️ Ce que cette bascule COÛTE, écrit ici pour que personne ne le redécouvre comme un bug : « Lt. Kane »
cesse d'être un visage reconnaissable d'une partie à l'autre. Le ruling user demande une variété de
POPULATION, pas des personnages récurrents — la perte est acceptée.

⚠️ Et le volume ne suffit PAS à supprimer les doublons. Pour 13 visages simultanés, un tirage par
hachage seul en produit avec p = 98,2 % à 24 visages, 49,0 % à 120, 41,4 % à 150, 12,3 % à 600.
⇒ Le mécanisme qui règle ça existe déjà à côté : `nomPourLieutenant` **SONDE** — le hachage donne le
point de départ, puis on avance jusqu'au premier libre. **Le même sondage appliqué aux visages donne
zéro doublon PAR CONSTRUCTION**, dès que le pool dépasse l'ensemble visible. Le volume redevient alors
un cadran de variété, pas une contrainte de correction.
⚠️ Propriété à préserver côté client : le sondage rend le visage stable **à ensemble visible donné** ;
un visage déjà attribué ne se recalcule pas quand l'ensemble change — comme pour les noms.

**La variété est construite en croisant des axes**, parce que 150 portraits écrits à l'inspiration se
ressemblent autant que 24. Le teint n'est PAS un axe : il ne survit pas à l'aplat aux quatre encres
(ruling user « accepter » — la diversité passe par le reste).

usage : campagne-visages.py <n> <index de départ>   → écrit les prompts et les génère
"""
import random
import subprocess
import sys
import time
from pathlib import Path

RACINE = Path(__file__).resolve().parent
# ⚠️ Le dossier d'archive est DATÉ, et `generer.py` écrit dans celui du JOUR. Un lot long traverse
# minuit : le 2026-09-06, les cinq derniers visages ont été écrits dans `2026-09-07/` pendant que ce
# script les cherchait dans `2026-09-06/` — cinq « ÉCHEC de génération » alors que les images
# existaient. ⇒ On cherche dans TOUS les dossiers datés, jamais dans un seul figé à l'heure du départ.
ARCHIVE = RACINE / "generees"


def trouver(motif):
    """Le fichier peut être tombé dans le dossier de la veille OU du lendemain — chercher les deux."""
    for jour in sorted(ARCHIVE.glob("20*"), reverse=True):
        for f in sorted(jour.glob(motif)):
            return f
    return None

BASE = ("Dark crime-drama portrait, late 1980s to early 1990s, the register of The Sopranos and The Wire: "
        "an ordinary person in everyday clothes, NOT gangster-movie elegance. NO tailored suit, NO wide-lapel "
        "jacket, NO necktie, nothing sharp or expensive. Bust, head and shoulders, front view, filling the "
        "square frame. Heavy chiaroscuro: one hard warm key light raking from the left, deep black shadow on "
        "the other side. Muted desaturated palette, dark blue-grey ground, no saturated colour, no text, no "
        "logo, no watermark. Painted poster illustration: flat areas of colour, thick contours, heavy "
        "simplification, no photorealism, no lens blur.")

AGE = ["in their early twenties", "in their late twenties", "in their thirties", "in their forties",
       "in their fifties", "in their sixties", "in their seventies"]
CORPS = ["gaunt and wiry", "slight and narrow-shouldered", "average build", "broad and square",
         "heavy-set and thick-necked", "tall and stooped", "short and stocky"]
CHEVEUX = ["a shaved head", "cropped hair", "a receding hairline", "thick unruly hair", "long hair to the shoulders",
           "hair scraped back into a bun", "short braids", "a blunt fringe", "greying curls", "a high ponytail",
           "thinning hair combed over", "close-cropped grey hair", "cornrows", "a loose bob"]
TETE = ["bare-headed", "bare-headed", "a flat cap", "a knitted beanie pulled low", "a baseball cap worn backwards",
        "a headscarf tied at the nape", "the hood of a sweatshirt up", "a rain hat", "a woollen watch cap"]
VISAGE = ["clean-shaven", "thick square glasses", "wire-rimmed glasses", "half-moon reading glasses",
          "deep frown lines", "a scar through one eyebrow", "hollow cheeks", "a broken nose",
          "heavy dark brows", "a birthmark on one cheek"]
VETEMENT = ["a worn leather blouson over an open polo shirt", "a zipped nylon windbreaker",
            "a quilted work jacket buttoned to the neck", "a zip-up fleece over a work shirt",
            "a sleeveless puffer vest over a thermal top", "a donkey jacket with a corduroy collar",
            "an oversized denim jacket", "a tracksuit top zipped halfway", "mechanic's overalls",
            "a heavy wool overcoat", "a hooded sweatshirt under a canvas coat", "a buttoned flannel shirt, no jacket",
            "a padded anorak", "a boiler suit", "a cardigan over a crew-neck shirt"]
SEXE = ["A man", "A woman", "A man", "A woman"]
# ⚠️ Deux axes ne sont PAS libres : la pilosité faciale et le pronom dépendent du sexe. Sans ce garde-fou
# le croisement produit « A woman … a neat goatee » — vu au premier essai, avant d'avoir dépensé un
# centime. Un croisement d'axes est une combinatoire, pas une licence.
VISAGE_HOMME = ["a heavy moustache", "three days of stubble", "a full beard", "a neat goatee",
                "a walrus moustache", "a jaw shaved raw"]
PRONOM = {"A man": "his", "A woman": "her"}


def prompts(n, depart):
    """Croise les axes avec un tirage SEMÉ : reproductible, et deux voisins diffèrent sur ≥ 3 axes."""
    r = random.Random(9006)
    vus = set()
    sortie = []
    i = 0
    while len(sortie) < depart + n:
        sexe = r.choice(SEXE)
        visage = r.choice(VISAGE + (VISAGE_HOMME if sexe == "A man" else []))
        combo = (sexe, r.choice(AGE), r.choice(CORPS), r.choice(CHEVEUX),
                 r.choice(TETE), visage, r.choice(VETEMENT))
        cle = combo[1:]                      # l'âge et le reste : le sexe seul ne suffit pas à distinguer
        if cle in vus:
            continue
        vus.add(cle)
        sexe, age, corps, cheveux, tete, visage, vetement = combo
        age = age.replace("their", PRONOM[sexe])
        sortie.append(f"{sexe} {age}, {corps}, with {cheveux}, {tete}, {visage}, wearing {vetement}.")
        i += 1
    return sortie[depart:]


def main() -> None:
    n = int(sys.argv[1])
    depart = int(sys.argv[2]) if len(sys.argv) > 2 else 0
    dossier = ARCHIVE / time.strftime("%Y-%m-%d")
    dossier.mkdir(parents=True, exist_ok=True)
    (dossier / "aplat").mkdir(exist_ok=True)
    tmp = RACINE / "prompts-visages"
    tmp.mkdir(exist_ok=True)
    for k, sujet in enumerate(prompts(n, depart), start=depart + 1):
        slug = f"visage-{k:03d}"
        if trouver(f"{slug}-*.png"):
            continue
        p = tmp / f"{slug}.txt"
        p.write_text(f"{sujet} {BASE}\n")
        subprocess.run([sys.executable, str(RACINE / "generer.py"), "--prompt-fichier", str(p),
                        "--largeur", "1024", "--hauteur", "1024", "--seed", "63", "--slug", slug],
                       check=False, capture_output=True)
        src = trouver(f"{slug}-*.png")
        if src is None:
            print(f"{slug} ÉCHEC de génération", flush=True)
            continue
        subprocess.run([sys.executable, str(RACINE / "detourer.py"), str(src), "--slug", f"matte-{slug}"],
                       check=False, capture_output=True)
        matte = trouver(f"matte-{slug}-*.png")
        if matte is None:
            print(f"{slug} ÉCHEC de détourage", flush=True)
            continue
        subprocess.run([sys.executable, str(RACINE / "posteriser.py"), str(src),
                        str(src.parent / "aplat" / f"{slug}.png"), str(matte)],
                       check=False, capture_output=True)
        print(f"{slug} ok — {sujet[:70]}", flush=True)


if __name__ == "__main__":
    main()
