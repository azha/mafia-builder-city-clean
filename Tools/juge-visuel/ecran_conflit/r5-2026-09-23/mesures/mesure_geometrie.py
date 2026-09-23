#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FILES = ["reference-1080x2102.png", "capture-1080x2400.png"]
ims = {n: Image.open(ROOT / n).convert("RGB") for n in FILES}

for n, im in ims.items():
    print(f"IMAGE {n}: {im.width}x{im.height}")
print("CONTROLE_POSITIF largeur image:", [im.width for im in ims.values()], "->", len({im.width for im in ims.values()}) == 1)
print("CONTROLE_NEGATIF hauteur image:", [im.height for im in ims.values()], "->", len({im.height for im in ims.values()}) > 1)


def runs(vals):
    out = []
    if not vals:
        return out
    a = p = vals[0]
    for v in vals[1:]:
        if v != p + 1:
            out.append((a, p))
            a = v
        p = v
    out.append((a, p))
    return out


def bbox_where(im, crop, pred):
    x0, y0, x1, y1 = crop
    xs, ys = [], []
    pix = im.load()
    for y in range(y0, y1):
        for x in range(x0, x1):
            if pred(*pix[x, y]):
                xs.append(x); ys.append(y)
    return None if not xs else (min(xs), min(ys), max(xs) + 1, max(ys) + 1, len(xs))


def broad_row_runs(im, pred, min_count):
    pix = im.load()
    ys = []
    for y in range(im.height):
        c = sum(1 for x in range(im.width) if pred(*pix[x, y]))
        if c >= min_count:
            ys.append(y)
    return runs(ys)


def row_span(im, y, pred):
    pix = im.load()
    xs = [x for x in range(im.width) if pred(*pix[x, y])]
    return None if not xs else (min(xs), max(xs), len(xs))


def flat_spans_at_x(im, x=540, minimum=30, tol=5):
    p = im.load(); out=[]; start=0; anchor=p[x,0]
    for y in range(1, im.height):
        cur=p[x,y]
        if max(abs(cur[k]-anchor[k]) for k in range(3)) > tol:
            if y-start >= minimum: out.append((start,y-1,anchor))
            start=y; anchor=cur
    if im.height-start >= minimum: out.append((start,im.height-1,anchor))
    return out


neutral_light = lambda r, g, b: r >= 225 and g >= 218 and b >= 205 and max(r, g, b) - min(r, g, b) <= 40
cream_text = lambda r, g, b: r >= 185 and g >= 160 and b >= 125 and r >= b + 25
gold = lambda r, g, b: r >= 125 and g >= 85 and b <= 75 and r >= b + 70
blue_panel = lambda r, g, b: b >= r + 5 and b >= 24 and 12 <= r <= 35 and 15 <= g <= 42

for n, im in ims.items():
    print(f"\n[{n}]")
    print("grands_aplats_clairs_y (>=700 px):", broad_row_runs(im, neutral_light, 700))
    for a, b in broad_row_runs(im, neutral_light, 700):
        mid = (a + b) // 2
        print("  span clair au milieu", mid, row_span(im, mid, neutral_light))
    print("grands_panneaux_bleus_y (>=700 px):", broad_row_runs(im, blue_panel, 700))
    # Consistent semantic crops, large enough to include text but not adjacent sections.
    if n.startswith("reference"):
        crops = {
            "titre": (20, 430, 1040, 525),
            "sous_titre": (20, 520, 1040, 615),
            "carte_phrase": (180, 680, 1030, 825),
            "famille_titre": (20, 995, 1040, 1055),
            "cta_texte": (35, 1910, 610, 2025),
        }
    else:
        crops = {
            "titre": (20, 440, 1040, 530),
            "sous_titre": (20, 525, 1040, 620),
            "carte_phrase": (180, 680, 1040, 830),
            "famille_titre": (20, 1000, 1040, 1060),
            "cta_texte": (35, 1900, 620, 2020),
        }
    for label, crop in crops.items():
        pred = gold if label == "cta_texte" else cream_text
        print(f"bbox_encre_{label}:", bbox_where(im, crop, pred), "crop", crop)
    # Section-color samples are 11x11 medians, always >=3 px from edges.
    samples = {
        "header_bg": (30, 100),
        "titre_bg": (30, 580),
        "dossier_bg": (20, 900),
        "carte_claire": (540, 700),
        "liste_bg": (20, 1200),
    }
    for label, (cx, cy) in samples.items():
        vals = []
        for yy in range(cy - 5, cy + 6):
            for xx in range(cx - 5, cx + 6):
                vals.append(im.getpixel((xx, yy)))
        vals.sort()
        print(f"mediane_{label}@{cx},{cy}:", vals[len(vals)//2])
    print("bandes_verticales_x540 >=30px:", flat_spans_at_x(im))

# Explicit section-boundary comparison (same width means px and % are both valid).
ref, cap = ims[FILES[0]], ims[FILES[1]]
print("\nREPERES: offset_x=0, echelle_x=1.000 (largeur commune 1080)")
print("largeur image/panneau: ref=1080 cap=1080 delta=0 (0.00%)")
rr = broad_row_runs(ref, neutral_light, 700); cr = broad_row_runs(cap, neutral_light, 700)
ra, rb = min(a for a,b in rr), max(b for a,b in rr); ca, cb = min(a for a,b in cr), max(b for a,b in cr)
rs = row_span(ref, (ra+rb)//2, neutral_light); cs = row_span(cap, (ca+cb)//2, neutral_light)
rw, cw = rs[1]-rs[0]+1, cs[1]-cs[0]+1
print(f"comparaison aplat clair ligne mediane: ref x={rs[0]}..{rs[1]} largeur={rw} ({rw/10.8:.2f}% écran); cap x={cs[0]}..{cs[1]} largeur={cw} ({cw/10.8:.2f}%); delta={cw-rw} px ({(cw-rw)/10.8:.2f} point écran)")
print(f"comparaison bloc clair vertical détecté: ref y={ra}..{rb} hauteur={rb-ra+1}; cap y={ca}..{cb} hauteur={cb-ca+1}; delta position={ca-ra:+d} px ({(ca-ra)/10.8:.2f}% largeur), delta hauteur={(cb-ca)-(rb-ra):+d}")
rt=bbox_where(ref,(20,430,1040,525),cream_text); ct=bbox_where(cap,(20,440,1040,530),cream_text)
print(f"comparaison titre encre: ref {rt[2]-rt[0]}x{rt[3]-rt[1]} @{rt[0]},{rt[1]}; cap {ct[2]-ct[0]}x{ct[3]-ct[1]} @{ct[0]},{ct[1]}; delta largeur={ct[2]-ct[0]-(rt[2]-rt[0]):+d} ({(ct[2]-ct[0]-(rt[2]-rt[0]))*100/(rt[2]-rt[0]):.2f}%), hauteur={ct[3]-ct[1]-(rt[3]-rt[1]):+d}, position=({ct[0]-rt[0]:+d},{ct[1]-rt[1]:+d})")
rcta=bbox_where(ref,(35,1910,610,2025),gold); ccta=bbox_where(cap,(35,1900,620,2020),gold)
print(f"comparaison CTA encre: ref {rcta[2]-rcta[0]}x{rcta[3]-rcta[1]} @{rcta[0]},{rcta[1]}; cap {ccta[2]-ccta[0]}x{ccta[3]-ccta[1]} @{ccta[0]},{ccta[1]}; delta y={ccta[1]-rcta[1]:+d} ({(ccta[1]-rcta[1])/10.8:.2f}% largeur écran)")
