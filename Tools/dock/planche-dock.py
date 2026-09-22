#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""La planche du dock pour l'user — PIL, sans navigateur.

Fond : le dock RÉEL du canon du HUD (`Tools/juge-visuel/ecran-principal/ecran-canon.png`, 1176 px = 392 CSS × 3, validé user), recadré.
Dans chaque rond, l'icône du canon est effacée (un disque de la teinte du rond) puis remplacée par notre raster (96 px, `Tools/dock/icones/`)
réduit à **60 px = 20 CSS × 3** — la taille du canon à cette échelle (à l'écran : ×3,27, ≈ 65 px) — teinté comme le canon le fait :
`filter: brightness(0) invert(.78)` ⇒ gris (199,199,199), l'alpha de l'icône conservé. Le libellé « MARCHÉ » devient « FILIÈRE » (dock ratifié).

Rangées : les 3 variantes de Filière, puis le témoin `icon_slot_dependency_arrow` à la place de Filière (pour vérifier qu'aucune variante ne
se confond avec lui). Légende : le double sens à trancher (Empire = le bâtiment « bureau » ; Plus = les réglages = le nœud de production).

Contrôle : la teinte posée est relue au centre de chaque icône (elle doit valoir 199 sur le pixel le plus opaque).
Usage : python3 Tools/dock/planche-dock.py  → Tools/dock/planche-dock-2026-09-23.png
"""
import os
from PIL import Image, ImageDraw, ImageFont

ICI = os.path.dirname(os.path.abspath(__file__))
CANON = os.path.join(ICI, '..', 'juge-visuel', 'ecran-principal', 'ecran-canon.png')
GRIS = (199, 199, 199)                                  # brightness(0) invert(.78) : 0,78 × 255
CENTRES_X = (282, 486, 690, 894)                        # les 4 ronds, mesurés sur le canon (ligne des centres y = H − 173)
ICONE = 60                                              # 20 CSS × 3
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
FONT_B = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'

def grise(nom):
    im = Image.open(os.path.join(ICI, 'icones', f'dock_{nom}_96.png')).convert('RGBA').resize((ICONE, ICONE), Image.LANCZOS)
    a = im.getchannel('A'); g = Image.new('RGBA', im.size, GRIS + (0,)); g.putalpha(a); return g

def bande(canon, slots, libelle3):
    W, H = canon.size; y0 = H - 280; b = canon.crop((0, y0, W, H - 20)).convert('RGBA')
    cy = (H - 173) - y0; d = ImageDraw.Draw(b)
    for x in CENTRES_X:
        teinte = b.getpixel((x, cy + 38))                # l'intérieur du rond, sous l'icône
        d.ellipse([x - 34, cy - 34, x + 34, cy + 34], fill=teinte)
    for x, nom in zip(CENTRES_X, slots):
        ic = grise(nom); b.alpha_composite(ic, (x - ICONE // 2, cy - ICONE // 2))
        # contrôle de teinte : le pixel le plus opaque de l'icône posée doit valoir le gris du canon
        px = max(((b.getpixel((x - ICONE // 2 + i, cy - ICONE // 2 + j)), ic.getpixel((i, j))[3]) for i in range(ICONE) for j in range(ICONE)), key=lambda t: t[1])
        assert px[1] < 250 or abs(px[0][0] - GRIS[0]) <= 2, f'teinte posée {px[0]} ≠ {GRIS}'
    # « MARCHÉ » → le libellé du 3ᵉ rond
    ly = cy + 101; x0, x1, ya, yb = CENTRES_X[2] - 75, CENTRES_X[2] + 75, ly - 20, ly + 20
    for x in range(x0, x1 + 1):                          # effacement colonne par colonne : on garde le dégradé du verre
        ca, cb = b.getpixel((x, ya - 1)), b.getpixel((x, yb + 1))
        for y in range(ya, yb + 1):
            t = (y - ya) / (yb - ya); b.putpixel((x, y), tuple(round(ca[i] * (1 - t) + cb[i] * t) for i in range(4)))
    f = ImageFont.truetype(FONT, 23); txt = libelle3; esp = 4
    larg = sum(d.textlength(c, font=f) for c in txt) + esp * (len(txt) - 1); x = CENTRES_X[2] - larg / 2
    for c in txt:
        d.text((x, ly - 13), c, font=f, fill=(185, 173, 146)); x += d.textlength(c, font=f) + esp
    return b

def main():
    canon = Image.open(CANON)
    rangs = [('A · nœuds et pointe', ['empire', 'famille', 'filiere', 'plus'], 'FILIÈRE'),
             ('B · nœuds carrés', ['empire', 'famille', 'filiere_carre', 'plus'], 'FILIÈRE'),
             ('C · maillons', ['empire', 'famille', 'filiere_maillons', 'plus'], 'FILIÈRE'),
             ('témoin · la flèche de dépendance (déjà au client) — AUCUNE variante ne doit s\'y confondre', ['empire', 'famille', 'temoin_dependance', 'plus'], 'TÉMOIN')]
    bandes = [(t, bande(canon, s, l)) for t, s, l in rangs]
    W = canon.size[0]; hb = bandes[0][1].size[1]; marge = 46; leg = 330
    out = Image.new('RGBA', (W, 90 + len(bandes) * (hb + marge) + leg + 30), (12, 16, 24, 255)); d = ImageDraw.Draw(out)
    fb = ImageFont.truetype(FONT_B, 30); f = ImageFont.truetype(FONT, 22); fs = ImageFont.truetype(FONT, 20)
    d.text((30, 26), 'Le dock ratifié — Empire · Famille · Filière · Plus', font=fb, fill=(234, 224, 200))
    d.text((W - 30 - d.textlength('gris du canon · 20 CSS px', font=f), 32), 'gris du canon · 20 CSS px', font=f, fill=(185, 173, 146))
    y = 90
    for t, b in bandes:
        d.text((30, y + 8), t, font=f, fill=(217, 171, 78)); out.alpha_composite(b, (0, y + marge - 6)); y += hb + marge
    y += 20
    lignes = [('À TRANCHER (user), les deux d\'un coup :', True),
              ('1. La forme de Filière : A, B ou C (rangées 1 à 3). Témoin : la rangée 4 ne doit ressembler à aucune.', False),
              ('2. Le double sens des icônes du canon : EMPIRE est le dessin du bâtiment « bureau » (fiche de bâtiment, carte) ;', False),
              ('   PLUS est le dessin des « réglages », identique au nœud « production » de la filière. Les garder, ou dessiner', False),
              ('   des icônes propres au dock. (Famille = l\'entrée « recrutement » du menu : même dessin, sens voisin.)', False),
              ('Rendu PIL depuis les SVG sources (Tools/dock/rasterise-icones-dock.py) : bbox contre la géométrie ;', False),
              ('forme identique aux 32 px du client à 0 / 2 / 16 pixels près.', False),
              ('Fond : le dock du canon du HUD validé (Tools/juge-visuel/ecran-principal/ecran-canon.png).', False)]
    for txt, gras in lignes:
        d.text((30, y), txt, font=fb if gras else fs, fill=(234, 224, 200) if gras else (185, 173, 146)); y += 40 if gras else 32
    dest = os.path.join(ICI, 'planche-dock-2026-09-23.png'); out.convert('RGB').save(dest)
    print(dest, out.size)

if __name__ == '__main__':
    main()
