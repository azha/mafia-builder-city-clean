#!/usr/bin/env python3
"""Boîtes d'encre des sous-parties visibles de l'écran ㉙, depuis les pixels."""

from pathlib import Path

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "ref": ROOT / "reference-1080x2102.png",
    "2400": ROOT / "capture-1080x2400.png",
    "1920": ROOT / "capture-1080x1920.png",
}


def bbox_exact(image, roi, color):
    x0, y0, x1, y1 = roi
    xs, ys = [], []
    pixels = image.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pixels[x, y] == color:
                xs.append(x)
                ys.append(y)
    if not xs:
        return None
    return min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs)


def print_part(image, label, roi, color):
    result = bbox_exact(image, roi, color)
    if result is None:
        print(f"  {label}: ABSENT pour token={color}, roi={roi}")
        return None
    x0, y0, x1, y1, count = result
    print(
        f"  {label}: token={color} bbox=({x0},{y0},{x1},{y1}) "
        f"w={x1-x0} ({(x1-x0)/image.width*100:.2f}%W) "
        f"h={y1-y0} ({(y1-y0)/image.width*100:.2f}%W) n={count}"
    )
    return result


def main():
    images = {name: Image.open(path).convert("RGB") for name, path in FILES.items()}
    print("DIMENSIONS DES IMAGES LUES")
    for name, image in images.items():
        print(f"  {name}: {FILES[name].name} = {image.width}x{image.height}")

    print("\nCONTRÔLE POSITIF")
    assert all(image.width == 1080 for image in images.values())
    print("  PASS largeur écran: ref=2400=1920=1080 px")
    title_ref = bbox_exact(images["ref"], (40, 450, 700, 530), (240, 223, 196))
    title_game = bbox_exact(images["2400"], (40, 250, 700, 325), (240, 223, 196))
    assert title_ref and title_game and abs((title_ref[3]-title_ref[1])-(title_game[3]-title_game[1])) <= 1
    print(
        "  PASS hauteur d'encre du titre: "
        f"ref={title_ref[3]-title_ref[1]} px, jeu={title_game[3]-title_game[1]} px"
    )
    name_ref = bbox_exact(images["ref"], (200, 1280, 620, 1360), (239, 230, 212))
    name_game = bbox_exact(images["2400"], (170, 900, 620, 980), (239, 230, 212))
    assert name_ref and name_game and abs((name_ref[3]-name_ref[1])-(name_game[3]-name_game[1])) <= 1
    print(
        "  PASS hauteur d'encre de « Tarcum »: "
        f"ref={name_ref[3]-name_ref[1]} px, jeu={name_game[3]-name_game[1]} px"
    )

    specs = {
        "ref": [
            ("H.titre", (40, 450, 700, 530), (240, 223, 196)),
            ("H.sous-titre", (40, 530, 1020, 610), (154, 138, 106)),
            ("O.avatar-disque", (70, 690, 225, 850), (221, 211, 192)),
            ("O.phrase-encre", (220, 700, 1020, 840), (42, 33, 24)),
            ("O.famille-rouge", (220, 700, 1020, 840), (140, 47, 54)),
            ("O.séparateur", (50, 830, 1030, 890), (203, 191, 164)),
            ("O.libellé-prise", (70, 870, 650, 960), (122, 109, 88)),
            ("O.valeur-prise", (600, 860, 1030, 980), (140, 47, 54)),
            ("L.titron", (40, 1010, 760, 1070), (138, 127, 107)),
            ("F1.nom", (190, 1110, 620, 1185), (239, 230, 212)),
            ("F1.meta", (190, 1160, 670, 1225), (138, 127, 107)),
            ("F1.historique", (600, 1100, 1010, 1225), (111, 99, 80)),
            ("F1.badge-bord", (790, 1090, 1010, 1210), (138, 106, 34)),
            ("F1.badge-texte", (790, 1090, 1010, 1210), (217, 171, 78)),
            ("B.réplique", (40, 1800, 1040, 1920), (205, 214, 224)),
            ("B.réplique-nom", (40, 1800, 300, 1880), (238, 243, 249)),
            ("B.cta", (70, 1940, 650, 2030), (217, 171, 78)),
            ("B.alerte", (600, 1940, 1030, 2030), (154, 138, 106)),
        ],
        "2400": [
            ("H.titre", (40, 250, 700, 325), (240, 223, 196)),
            ("H.sous-titre", (40, 320, 1020, 365), (154, 138, 106)),
            ("O.avatar-disque", (65, 400, 210, 530), (221, 211, 192)),
            ("O.phrase-encre", (180, 390, 1040, 530), (42, 34, 22)),
            ("O.famille-rouge", (180, 390, 1040, 530), (140, 46, 53)),
            ("O.séparateur", (45, 525, 1040, 570), (203, 191, 164)),
            ("O.libellé-prise", (70, 565, 650, 640), (117, 103, 85)),
            ("O.valeur-prise", (600, 560, 1040, 645), (140, 46, 53)),
            ("L.titron", (40, 650, 800, 705), (138, 127, 106)),
            ("F1.nom", (160, 730, 620, 810), (239, 230, 212)),
            ("F1.meta", (160, 785, 680, 840), (184, 194, 204)),
            ("F1.historique", (450, 730, 1040, 840), (148, 132, 106)),
            ("F1.historique-meta", (450, 785, 1040, 840), (184, 194, 204)),
            ("F1.badge-bord", (830, 730, 1040, 840), (138, 106, 34)),
            ("F1.badge-texte", (830, 730, 1040, 840), (217, 171, 77)),
            ("B.réplique", (40, 1860, 1040, 1960), (205, 214, 224)),
            ("B.cta", (60, 1970, 650, 2090), (217, 171, 77)),
            ("B.alerte", (600, 1970, 1040, 2090), (154, 138, 106)),
        ],
        "1920": [
            ("F4.nom-visible", (160, 1240, 620, 1355), (239, 230, 212)),
            ("F4.meta-visible", (160, 1280, 680, 1369), (184, 194, 204)),
            ("B.réplique", (40, 1380, 1040, 1480), (205, 214, 224)),
            ("B.cta", (60, 1490, 650, 1610), (217, 171, 77)),
        ],
    }

    for name, parts in specs.items():
        print(f"\nSOUS-PARTIES — {name}")
        for label, roi, color in parts:
            print_part(images[name], label, roi, color)

    print("\nCONTRÔLE NÉGATIF")
    ref_meta = bbox_exact(images["ref"], (190, 1160, 670, 1225), (138, 127, 107))
    game_meta_same_token = bbox_exact(images["2400"], (160, 785, 680, 840), (138, 127, 107))
    game_meta = bbox_exact(images["2400"], (160, 785, 680, 840), (184, 194, 204))
    assert ref_meta and not game_meta_same_token and game_meta
    print("  PASS le token chaud de métadonnée est absent de l'homologue jeu; le token bleu-gris est présent")


if __name__ == "__main__":
    main()
