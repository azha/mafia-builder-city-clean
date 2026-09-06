#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Étend un décor peint 1080×1920 à la seconde résolution de travail, 1080×2400.

⛔ **CE N'EST PAS UN PROVISOIRE — c'est le remède.** Le re-rendu 20:9 a été ANNULÉ après mesure des
caméras de la scène : à capteur 36 / focale 50 en `sensor_fit=AUTO`, passer de 1080×1920 à 1080×2400
garde le champ vertical à 39,6° et fait tomber l'horizontal de 22,9° à **18,4°** — soit **−20 % de
largeur et zéro gain en hauteur**. Gagner de la hauteur exigerait de reculer la caméra ou d'élargir la
focale, donc de re-cadrer chaque scène, et deux scènes n'ont plus de `.blend` sauvegardé (~3 h avant le
premier pixel). *Un dispositif qu'on croit temporaire meurt de bonne foi* : celui-ci est définitif tant
qu'aucun rendu 20:9 recadré n'existe.

**Le geste, et pourquoi il est sûr** : on ajoute les 480 px manquants **EN HAUT uniquement**, par
réplication de la première ligne (le ciel). Jamais en bas.
⇒ Le sol, la ligne d'horizon et tout ce qui est ancré au bas de l'image **ne bougent pas d'un pixel** :
c'est la même contrainte que celle payée sur le pivot du fond pré-rendu — *un recadrage déplace le pivot
dès qu'il est ancré sur le FICHIER et non sur le CONTENU*, et étendre par le haut la respecte par
construction.

Deux gardes, exécutées à chaque appel :
  · **fidélité** — la bande basse de 1920 px doit être IDENTIQUE à la source (0 différence) ;
  · **continuité** — la dernière ligne ajoutée doit égaler la première ligne de la source (raccord
    invisible par construction), et le contrôle positif est une extension par une couleur ARBITRAIRE,
    qui doit la faire rougir.

usage : etendre-decor.py <source.png> <sortie.png> [hauteur cible=2400]
"""
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageStat


def etendre(src: Image.Image, cible: int):
    """Étend vers le haut, et FOND la bande vers le ciel plat.

    ⚠️ Répliquer la première ligne telle quelle donne des TRAÎNÉES VERTICALES : sur ces scènes la ligne
    du haut n'est pas du ciel, des toits la touchent, et chaque toit se prolonge en colonne jusqu'en
    haut du cadre (vu à l'œil au premier essai, alors que les deux gardes étaient vertes — *une garde de
    raccord ne dit rien de ce qu'il y a au-dessus du raccord*).
    ⇒ La bande part de la ligne d'origine (raccord exact, continuité préservée) et **fond vers la
    couleur médiane du ciel** à mesure qu'elle monte : les toits s'effacent, le haut devient un aplat.
    """
    w, h = src.size
    if h >= cible:
        sys.exit(f"la source fait déjà {h} px de haut — rien à étendre")
    manque = cible - h
    ligne = src.crop((0, 0, w, 1))
    # le ciel de référence : la médiane des 30 premières lignes, colonne par colonne aplatie en 1 px
    haut = src.crop((0, 0, w, 30)).resize((1, 1), Image.BOX).getpixel((0, 0))
    bande = Image.new("RGB", (w, manque))
    for y in range(manque):
        t = (manque - 1 - y) / max(1, manque - 1)        # 1 en haut du cadre, 0 au raccord
        f = t ** 0.7                                      # le fondu mord vite, la continuité reste nette
        plat = Image.new("RGB", (w, 1), haut)
        bande.paste(Image.blend(ligne, plat, f), (0, y))
    out = Image.new("RGB", (w, cible))
    out.paste(bande, (0, 0))
    out.paste(src, (0, manque))
    return out, manque


def main() -> None:
    src = Image.open(sys.argv[1]).convert("RGB")
    sortie = Path(sys.argv[2])
    cible = int(sys.argv[3]) if len(sys.argv) > 3 else 2400
    out, manque = etendre(src, cible)

    w, h = src.size
    fidelite = ImageStat.Stat(ImageChops.difference(out.crop((0, manque, w, cible)), src)).mean[0]
    if fidelite != 0.0:
        sys.exit(f"FIDÉLITÉ ROMPUE : la bande d'origine diffère de {fidelite:.3f} — rien écrit")

    def saut(im):
        a = im.crop((0, manque - 1, w, manque)); b = im.crop((0, manque, w, manque + 1))
        return ImageStat.Stat(ImageChops.difference(a, b)).mean[0]

    continu = saut(out)
    faux = Image.new("RGB", (w, cible), (255, 0, 255))
    faux.paste(src, (0, manque))
    temoin = saut(faux)
    if temoin <= continu:
        sys.exit(f"contrôle positif RATÉ : une extension arbitraire rend {temoin:.2f} ≤ {continu:.2f}")

    sortie.parent.mkdir(parents=True, exist_ok=True)
    out.save(sortie)
    print(f"{sortie.name} · {w}×{cible} · +{manque} px de ciel EN HAUT (le sol ne bouge pas)")
    print(f"  fidélité de la bande d'origine : {fidelite:.3f} (0 attendu) ✓")
    print(f"  saut au raccord : {continu:.2f} · contrôle positif (extension arbitraire) : {temoin:.2f} ✓")


if __name__ == "__main__":
    main()
