#!/usr/bin/env python3
"""Mesures reproductibles de géométrie pour le dossier r3 de l'écran ㉙.

Le script ne lit que les trois PNG autorisés par dossier.md. Les boîtes sont les
limites de pixels exactement égaux à un token, par groupe vertical contigu. Ce
choix évite d'inventer une boîte CSS à partir de l'image.
"""

from collections import defaultdict
from hashlib import sha256
from pathlib import Path

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


def token_groups(image, color, minimum_per_row=20):
    """Retourne les groupes verticaux et leur bbox d'encre exacte [x0,y0,x1,y1)."""
    pixels = image.load()
    rows = []
    for y in range(image.height):
        xs = [x for x in range(image.width) if pixels[x, y] == color]
        if len(xs) >= minimum_per_row:
            rows.append((y, min(xs), max(xs) + 1, len(xs)))
    groups = []
    current = []
    previous_y = None
    for row in rows:
        if previous_y is None or row[0] == previous_y + 1:
            current.append(row)
        else:
            groups.append(current)
            current = [row]
        previous_y = row[0]
    if current:
        groups.append(current)
    result = []
    for group in groups:
        result.append(
            {
                "bbox": (
                    min(row[1] for row in group),
                    group[0][0],
                    max(row[2] for row in group),
                    group[-1][0] + 1,
                ),
                "max_run": max(row[3] for row in group),
            }
        )
    return result


def exact_color_y_groups(image, color, minimum_total=3):
    pixels = image.load()
    ys = []
    for y in range(image.height):
        count = sum(pixels[x, y] == color for x in range(image.width))
        if count:
            ys.append((y, count))
    groups = []
    current = []
    previous_y = None
    for row in ys:
        if previous_y is None or row[0] == previous_y + 1:
            current.append(row)
        else:
            if sum(item[1] for item in current) >= minimum_total:
                groups.append(current)
            current = [row]
        previous_y = row[0]
    if current and sum(item[1] for item in current) >= minimum_total:
        groups.append(current)
    return [(g[0][0], g[-1][0] + 1, sum(item[1] for item in g)) for g in groups]


def print_groups(label, image, color):
    print(f"{label} token={color}")
    for index, group in enumerate(token_groups(image, color), 1):
        x0, y0, x1, y1 = group["bbox"]
        print(
            f"  g{index}: bbox=({x0},{y0},{x1},{y1}) "
            f"w={x1-x0} ({(x1-x0)/image.width*100:.2f}%W) "
            f"h={y1-y0} ({(y1-y0)/image.width*100:.2f}%W) "
            f"max_run={group['max_run']}"
        )


def main():
    images = load_images()

    print("\nCONTRÔLE POSITIF")
    widths = {name: image.width for name, image in images.items()}
    assert len(set(widths.values())) == 1 and next(iter(widths.values())) == 1080
    print("  PASS largeur écran: ref=2400=1920=1080 px")

    stable_tokens = [
        ("serviette", (242, 236, 224)),
        ("carte ciblée", (46, 34, 22)),
    ]
    for label, token in stable_tokens:
        box_2400 = token_groups(images["2400"], token)[0]["bbox"]
        box_1920 = token_groups(images["1920"], token)[0]["bbox"]
        assert box_2400 == box_1920
        print(f"  PASS captures, bbox {label} identique: 2400=1920={box_2400}")

    normal_2400 = token_groups(images["2400"], (34, 28, 22))
    normal_1920 = token_groups(images["1920"], (34, 28, 22))
    assert [g["bbox"] for g in normal_2400[:2]] == [g["bbox"] for g in normal_1920[:2]]
    print(
        "  PASS captures, deux premières cartes normales identiques: "
        f"{[g['bbox'] for g in normal_2400[:2]]}"
    )

    cream_ref = token_groups(images["ref"], (242, 236, 224))[0]["bbox"]
    cream_game = token_groups(images["2400"], (242, 236, 224))[0]["bbox"]
    cream_delta = (cream_game[2] - cream_game[0]) - (cream_ref[2] - cream_ref[0])
    assert abs(cream_delta) / 1080 <= 0.015
    print(
        "  PASS serviette, largeur d'encre plate: "
        f"ref={cream_ref[2]-cream_ref[0]} px, jeu={cream_game[2]-cream_game[0]} px, "
        f"delta={cream_delta:+d} px={cream_delta/1080*100:+.2f}% écran (tolérance 1,5%)"
    )

    target_ref = token_groups(images["ref"], (46, 33, 20))[0]["bbox"]
    target_game = token_groups(images["2400"], (46, 34, 22))[0]["bbox"]
    target_delta = (target_game[2] - target_game[0]) - (target_ref[2] - target_ref[0])
    assert abs(target_delta) / 1080 <= 0.015
    print(
        "  PASS carte ciblée, largeur d'encre plate: "
        f"ref={target_ref[2]-target_ref[0]} px, jeu={target_game[2]-target_game[0]} px, "
        f"delta={target_delta:+d} px={target_delta/1080*100:+.2f}% écran"
    )

    title_ref = exact_color_y_groups(images["ref"], (240, 223, 196))[0]
    title_game = exact_color_y_groups(images["2400"], (240, 223, 196))[0]
    ref_height = title_ref[1] - title_ref[0]
    game_height = title_game[1] - title_game[0]
    assert abs(game_height - ref_height) <= 1
    print(
        "  PASS titre principal, hauteur d'encre du token crème: "
        f"ref={ref_height} px, jeu={game_height} px, delta={game_height-ref_height:+d} px (tolérance 1 px)"
    )

    print("\nBOÎTES DE TOKENS — RÉFÉRENCE")
    print_groups("entête", images["ref"], (32, 24, 15))
    print_groups("bord entête", images["ref"], (61, 48, 36))
    print_groups("serviette", images["ref"], (242, 236, 224))
    print_groups("carte cible", images["ref"], (46, 33, 20))
    print_groups("cartes normales", images["ref"], (36, 28, 20))
    print_groups("séparateur bas", images["ref"], (44, 54, 64))
    print_groups("bande basse", images["ref"], (20, 26, 33))

    print("\nBOÎTES DE TOKENS — CAPTURE 1080x2400")
    print_groups("entête", images["2400"], (34, 22, 13))
    print_groups("bord entête", images["2400"], (61, 49, 34))
    print_groups("serviette", images["2400"], (242, 236, 224))
    print_groups("carte cible", images["2400"], (46, 34, 22))
    print_groups("cartes normales", images["2400"], (34, 28, 22))
    print_groups("bande basse", images["2400"], (22, 28, 34))
    print_groups("dock", images["2400"], (13, 19, 30))

    print("\nBOÎTES DE TOKENS — CAPTURE 1080x1920")
    print_groups("serviette", images["1920"], (242, 236, 224))
    print_groups("cartes normales", images["1920"], (34, 28, 22))
    print_groups("bande basse", images["1920"], (22, 28, 34))
    print_groups("dock", images["1920"], (13, 19, 30))

    print("\nMESURES DÉRIVÉES")
    header_ref = token_groups(images["ref"], (32, 24, 15))[0]["bbox"]
    header_game = token_groups(images["2400"], (34, 22, 13))[0]["bbox"]
    horizontal_scale = header_game[2] - header_game[0]
    horizontal_scale /= header_ref[2] - header_ref[0]
    horizontal_offset = header_game[0] - horizontal_scale * header_ref[0]
    print(
        "  correspondance horizontale des repères racine: "
        f"x_jeu={horizontal_scale:.6f}*x_ref{horizontal_offset:+.3f} "
        f"(ref x={header_ref[0]}..{header_ref[2]}, jeu x={header_game[0]}..{header_game[2]})"
    )
    print(
        "  correspondance verticale locale de départ d'entête: "
        f"y_jeu=y_ref{header_game[1]-header_ref[1]:+d}; "
        "pas de facteur vertical global valide (entête, corps et bande basse divergent)"
    )
    print(
        "  entête plate: "
        f"ref y={header_ref[1]}..{header_ref[3]-1} h={header_ref[3]-header_ref[1]} ; "
        f"jeu y={header_game[1]}..{header_game[3]-1} h={header_game[3]-header_game[1]} ; "
        f"delta hauteur={(header_game[3]-header_game[1])-(header_ref[3]-header_ref[1]):+d} px"
    )
    print(
        "  chrome avant entête plate: "
        f"ref={header_ref[1]} px={header_ref[1]/1080*100:.2f}%W ; "
        f"jeu={header_game[1]} px={header_game[1]/1080*100:.2f}%W ; "
        f"delta={header_game[1]-header_ref[1]:+d} px="
        f"{(header_game[1]-header_ref[1])/1080*100:+.2f} points W"
    )
    print(
        "  serviette: "
        f"ref bbox={cream_ref} h={cream_ref[3]-cream_ref[1]} ; "
        f"jeu bbox={cream_game} h={cream_game[3]-cream_game[1]} ; "
        f"delta hauteur={(cream_game[3]-cream_game[1])-(cream_ref[3]-cream_ref[1]):+d} px "
        f"({((cream_game[3]-cream_game[1])/(cream_ref[3]-cream_ref[1])-1)*100:+.1f}%)"
    )

    ref_border_end = token_groups(images["ref"], (61, 48, 36))[0]["bbox"][3]
    game_border_end = token_groups(images["2400"], (61, 49, 34))[0]["bbox"][3]
    print(
        "  écart bord-entête → serviette: "
        f"ref={cream_ref[1]-ref_border_end:+d} px ; jeu={cream_game[1]-game_border_end:+d} px "
        "(valeur négative = chevauchement)"
    )

    ref_normal = token_groups(images["ref"], (36, 28, 20))
    game_normal = token_groups(images["2400"], (34, 28, 22))
    ref_gaps = [ref_normal[i + 1]["bbox"][1] - ref_normal[i]["bbox"][3] for i in range(2)]
    game_gaps = [game_normal[i + 1]["bbox"][1] - game_normal[i]["bbox"][3] for i in range(2)]
    print(f"  cartes normales: ref hauteurs={[g['bbox'][3]-g['bbox'][1] for g in ref_normal]} gaps={ref_gaps}")
    print(f"  cartes normales: jeu hauteurs={[g['bbox'][3]-g['bbox'][1] for g in game_normal]} gaps={game_gaps}")

    bottom_ref = token_groups(images["ref"], (20, 26, 33))[0]["bbox"]
    bottom_2400 = token_groups(images["2400"], (22, 28, 34))[0]["bbox"]
    bottom_1920 = token_groups(images["1920"], (22, 28, 34))[0]["bbox"]
    last_card_2400 = game_normal[-1]["bbox"]
    last_card_1920 = token_groups(images["1920"], (34, 28, 22))[-1]["bbox"]
    print(
        "  vide entre dernière encre plate de carte et bande basse: "
        f"ref={bottom_ref[1]-ref_normal[-1]['bbox'][3]} px ; "
        f"2400={bottom_2400[1]-last_card_2400[3]} px ; "
        f"1920={bottom_1920[1]-last_card_1920[3]} px"
    )
    void_ref = bottom_ref[1] - ref_normal[-1]["bbox"][3]
    void_2400 = bottom_2400[1] - last_card_2400[3]
    print(
        "  vide 2400 normalisé: "
        f"{void_2400} px={void_2400/1080*100:.2f}%W ; "
        f"surcroît vs ref={void_2400-void_ref:+d} px="
        f"{(void_2400-void_ref)/1080*100:+.2f}%W"
    )
    print(
        "  1920, portion masquée dans l'état initial par rapport à la carte entière du 2400: "
        f"bas attendu y={last_card_2400[3]}, début bande basse y={bottom_1920[1]}, "
        f"masqué={last_card_2400[3]-bottom_1920[1]} px"
    )
    print(
        "  ancrage de la bande basse entre captures: "
        f"y2400={bottom_2400[1]}, y1920={bottom_1920[1]}, delta={bottom_2400[1]-bottom_1920[1]} px "
        "(égal au delta de hauteur 480 px)"
    )

    print("\nCONTRÔLE NÉGATIF")
    assert bottom_2400[1] - bottom_1920[1] == 480
    print("  PASS l'instrument discrimine l'ancrage: bande basse décalée exactement de 480 px")


if __name__ == "__main__":
    main()
