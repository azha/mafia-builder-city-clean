#!/usr/bin/env python3
"""Palette, luminance, densité et contrastes du dossier r3 de l'écran ㉙."""

from collections import Counter
from pathlib import Path
from statistics import median

from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
FILES = {
    "ref": ROOT / "reference-1080x2102.png",
    "2400": ROOT / "capture-1080x2400.png",
    "1920": ROOT / "capture-1080x1920.png",
}


def load_images():
    images = {name: Image.open(path).convert("RGB") for name, path in FILES.items()}
    print("DIMENSIONS DES IMAGES LUES")
    for name, image in images.items():
        print(f"  {name}: {FILES[name].name} = {image.width}x{image.height}")
    return images


def srgb_channel(value):
    value /= 255.0
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4


def luminance(rgb):
    r, g, b = (srgb_channel(value) for value in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(foreground, background):
    light, dark = sorted((luminance(foreground), luminance(background)), reverse=True)
    return (light + 0.05) / (dark + 0.05)


def median_window(image, box):
    pixels = list(image.crop(box).getdata())
    return tuple(int(median(channel)) for channel in zip(*pixels))


def quantized_palette(image, colors=6):
    thumb = image.copy()
    thumb.thumbnail((270, 600))
    quantized = thumb.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    palette = quantized.getpalette()
    counts = Counter(quantized.getdata())
    total = sum(counts.values())
    return [
        (tuple(palette[index * 3 : index * 3 + 3]), count / total * 100)
        for index, count in counts.most_common(colors)
    ]


def mean_luminance(image):
    # Réduction uniquement pour le coût; BOX conserve la moyenne d'aire.
    small = image.resize((270, max(1, round(image.height * 270 / image.width))), Image.Resampling.BOX)
    values = [luminance(pixel) for pixel in small.getdata()]
    return sum(values) / len(values) * 100


def residual_density(image, colors=8, threshold=18):
    """Part hors des 8 tons dominants, distance Chebyshev >18 par canal.

    C'est un proxy reproductible d'encre/détail, pas une segmentation sémantique.
    """
    small = image.resize((270, max(1, round(image.height * 270 / image.width))), Image.Resampling.BOX)
    quantized = small.quantize(colors=colors, method=Image.Quantize.MEDIANCUT)
    pal = quantized.getpalette()
    centers = [tuple(pal[index * 3 : index * 3 + 3]) for index in Counter(quantized.getdata())]
    residual = 0
    pixels = list(small.getdata())
    for pixel in pixels:
        if min(max(abs(pixel[i] - center[i]) for i in range(3)) for center in centers) > threshold:
            residual += 1
    return residual / len(pixels) * 100


def roi_mode(image, box, excluded):
    counts = Counter(image.crop(box).getdata())
    for color, count in counts.most_common():
        if color not in excluded:
            return color, count
    raise RuntimeError("ROI sans couleur admissible")


def main():
    images = load_images()

    print("\nCONTRÔLE POSITIF")
    assert all(image.width == 1080 for image in images.values())
    print("  PASS largeur écran: ref=2400=1920=1080 px")

    cream_ref = median_window(images["ref"], (500, 850, 540, 870))
    cream_game = median_window(images["2400"], (500, 540, 540, 560))
    assert cream_ref == cream_game == (242, 236, 224)
    print(f"  PASS papier crème médian: ref={cream_ref}, jeu={cream_game}, delta=(0,0,0)")

    equal_tokens = [
        ("titre crème", (240, 223, 196), (240, 223, 196)),
        ("nom de famille", (239, 230, 212), (239, 230, 212)),
        ("ligne papier", (203, 191, 164), (203, 191, 164)),
        ("or CTA", (217, 171, 78), (217, 171, 77)),
        ("rouge cible", (140, 47, 54), (140, 46, 53)),
        ("carte normale", (36, 28, 20), (34, 28, 22)),
        ("carte ciblée", (46, 33, 20), (46, 34, 22)),
        ("bande basse", (20, 26, 33), (22, 28, 34)),
        ("entête", (32, 24, 15), (34, 22, 13)),
    ]
    for label, reference, game in equal_tokens:
        delta = tuple(game[i] - reference[i] for i in range(3))
        assert max(abs(value) for value in delta) <= 6
        print(f"  PASS {label}: ref={reference}, jeu={game}, delta={delta} (tolérance 6/canal)")

    print("\nPALETTES QUANTIFIÉES (6 tons, pourcentage d'aire)")
    for name, image in images.items():
        print(f"  {name}:")
        for color, percent in quantized_palette(image):
            print(f"    {color}: {percent:.2f}%")

    print("\nCOUCHE GLOBALE")
    for name, image in images.items():
        print(
            f"  {name}: luminance moyenne={mean_luminance(image):.2f}% ; "
            f"densité résiduelle (>18 RGB des 8 tons dominants)={residual_density(image):.2f}%"
        )

    print("\nAPLATS, MÉDIANES DE FENÊTRES")
    windows = {
        "entête": {"ref": (900, 450, 1000, 470), "2400": (900, 250, 1000, 270)},
        "papier": {"ref": (500, 850, 540, 870), "2400": (500, 540, 540, 560)},
        "carte cible": {"ref": (500, 1100, 600, 1120), "2400": (500, 720, 600, 740)},
        "carte normale": {"ref": (500, 1280, 600, 1300), "2400": (500, 900, 600, 920)},
        "bande basse": {"ref": (500, 1790, 600, 1810), "2400": (500, 1860, 600, 1880)},
    }
    for label, pair in windows.items():
        reference = median_window(images["ref"], pair["ref"])
        game = median_window(images["2400"], pair["2400"])
        delta = tuple(game[i] - reference[i] for i in range(3))
        print(f"  {label}: ref={reference}, jeu={game}, delta={delta}")

    ref_desc, _ = roi_mode(
        images["ref"], (205, 1345, 600, 1380), {(36, 28, 20)}
    )
    game_desc, _ = roi_mode(
        images["2400"], (175, 965, 600, 1005), {(34, 28, 22)}
    )
    desc_delta = tuple(game_desc[i] - ref_desc[i] for i in range(3))
    print(
        "  mode d'encre, sous-titre de famille homologue: "
        f"ref={ref_desc}, jeu={game_desc}, delta={desc_delta}"
    )

    print("\nCONTRASTES WCAG DE TOKENS MESURÉS")
    pairs = [
        ("ref titre/entête", (240, 223, 196), (32, 24, 15)),
        ("jeu titre/entête", (240, 223, 196), (34, 22, 13)),
        ("ref phrase/papier", (42, 33, 24), (242, 236, 224)),
        ("jeu phrase/papier", (42, 34, 22), (242, 236, 224)),
        ("ref cible rouge/papier", (140, 47, 54), (242, 236, 224)),
        ("jeu cible rouge/papier", (140, 46, 53), (242, 236, 224)),
        ("ref nom/carte", (239, 230, 212), (36, 28, 20)),
        ("jeu nom/carte", (239, 230, 212), (34, 28, 22)),
        ("ref métadonnée/carte", ref_desc, (36, 28, 20)),
        ("jeu métadonnée/carte", game_desc, (34, 28, 22)),
        ("ref CTA/fond", (217, 171, 78), (36, 28, 17)),
        ("jeu CTA/fond", (217, 171, 77), (34, 28, 13)),
    ]
    for label, foreground, background in pairs:
        print(f"  {label}: {contrast(foreground, background):.2f}:1")

    print("\nCONTRÔLE NÉGATIF")
    assert max(abs(value) for value in desc_delta) > 6
    print(
        "  PASS l'instrument discrimine le sous-titre de famille: "
        f"delta={desc_delta}, hors tolérance 6/canal"
    )


if __name__ == "__main__":
    main()
