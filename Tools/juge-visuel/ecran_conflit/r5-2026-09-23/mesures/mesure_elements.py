#!/usr/bin/env python3
from pathlib import Path
from PIL import Image

ROOT = Path(__file__).resolve().parent.parent
FILES = ["reference-1080x2102.png", "capture-1080x2400.png"]
ims = {n: Image.open(ROOT / n).convert("RGB") for n in FILES}
for n, im in ims.items(): print(f"IMAGE {n}: {im.width}x{im.height}")
print("CONTROLE_POSITIF largeur:", [im.width for im in ims.values()], "->", len({im.width for im in ims.values()}) == 1)
print("CONTROLE_NEGATIF hauteur:", [im.height for im in ims.values()], "->", len({im.height for im in ims.values()}) > 1)


def bbox(im, crop, pred):
    x0,y0,x1,y1=crop; p=im.load(); xs=[]; ys=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if pred(*p[x,y]): xs.append(x); ys.append(y)
    return None if not xs else (min(xs),min(ys),max(xs)+1,max(ys)+1,len(xs))


def median_window(im, x, y, rad=3):
    vals=[im.getpixel((xx,yy)) for yy in range(y-rad,y+rad+1) for xx in range(x-rad,x+rad+1)]
    return tuple(sorted(v[k] for v in vals)[len(vals)//2] for k in range(3))


def lum(rgb): return 0.2126*rgb[0]+0.7152*rgb[1]+0.0722*rgb[2]


gold=lambda r,g,b: r>=115 and g>=75 and b<=80 and r-b>=60
bright=lambda r,g,b: r>=165 and g>=150 and b>=125
dark_figure=lambda r,g,b: lum((r,g,b))<145

for n,im in ims.items():
    ref=n.startswith("reference")
    print(f"\n[{n}]")
    if ref:
        avatar=(75,690,215,830); selected=(35,1035,1020,1235); quote=(35,1775,1040,1940); cta=(35,1920,1040,2060)
        points={"avatar_fond":(147,748),"avatar_figure":(147,779),"avatar_cercle":(147,720)}
    else:
        avatar=(55,700,220,855); selected=(25,1040,1050,1240); quote=(35,1765,1040,1910); cta=(35,1890,1050,2020)
        points={"avatar_fond":(146,744),"avatar_figure":(146,801),"avatar_cercle":(146,720)}
    print("bbox_avatar_pixels_sombres(<145):",bbox(im,avatar,dark_figure),"crop",avatar)
    for label,(x,y) in points.items(): print(f"mediane_{label}@{x},{y}:",median_window(im,x,y))
    bg=median_window(im,*points["avatar_cercle"]); fg=median_window(im,*points["avatar_figure"])
    print("contraste_luminance_avatar_cercle-figure:",round(abs(lum(bg)-lum(fg)),1))
    print("bbox_or_carte_selectionnee:",bbox(im,selected,gold),"crop",selected)
    print("bbox_or_CTA:",bbox(im,cta,gold),"crop",cta)
    print("bbox_encre_claire_replique:",bbox(im,quote,bright),"crop",quote)

# Controls that the color sampler discriminates the panel token from the avatar figure.
ref=ims[FILES[0]]; cap=ims[FILES[1]]
print("\nCONTROLE_POSITIF aplat carte claire @540,700:",median_window(ref,540,700),median_window(cap,540,700))
print("CONTROLE_NEGATIF figure avatar (points homologues):",median_window(ref,147,779),median_window(cap,146,801))
print("delta contraste avatar capture-reference:", round(102.1-15.6,1), "points de luminance")
