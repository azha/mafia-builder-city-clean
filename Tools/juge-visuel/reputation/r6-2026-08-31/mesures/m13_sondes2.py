# m13 - sondes couleur nommees, en coordonnees PX propres a chaque image (reperes m01/m03/m04/m11).
# Controle positif : peau du visage, fond de panneau portrait (attendus EGAUX).
# Controle negatif : or du cadre vs fond du cadre (doivent differer massivement dans LES DEUX).
from PIL import Image
D="/home/erutheone/project/mafia-unity-B/Tools/juge-visuel/reputation/r6-2026-08-31/"
S="/home/erutheone/project/mafia-unity-B/Assets/Screenshots/"
REF=D+"reference/m-120.png"; CAP=S+"screen_b3_reputation_1080x1920.png"
P={ # nom : (x_ref,y_ref, x_cap,y_cap)
 "or du cadre (bordure gauche)":        (19, 1000,  19, 800),
 "fond du cadre (hors panneau)":        (30,  570,  30,  250),
 "plaque titre - fond":                 (100, 420, 100,  60),
 "plaque titre - bordure gauche":       (43,  480,  48,  150),
 "trait dore sous le titre":            (450, 554, 540, 225),
 "T1 bordure gauche":                   (43,  660,  48,  350),
 "T1 fond":                             (70,  700,  80,  420),
 "T2 bordure gauche":                   (321, 660, 385, 350),
 "T2 fond":                             (350, 700, 420, 420),
 "T3 bordure gauche":                   (599, 660, 722, 350),
 "T3 fond":                             (630, 700, 760, 420),
 "panneau portrait - fond":             (700,1300, 900,1120),
 "panneau portrait - bordure gauche":   (43, 1000,  48, 800),
 "carte portrait - or bordure gauche":  (70, 1000,  73, 800),
 "carte portrait - fond":               (100, 800, 110, 500),
 "visage (peau)":                       (245, 970, 275, 700),
 "buste (etoffe)":                      (245,1200, 275, 960),
 "montre (cadran)":                     (155,1152, 165, 900),
 "panneau verdict - fond":              (450,1420, 540,1400),
 "panneau verdict - bordure gauche":    (43, 1420,  48,1400),
 "CTA - bordure haute":                 (450,1627, 540,1526),
 "CTA - fond":                          (450,1660, 540,1560),
 "rangee regle 1 - fond":               (700, 880, 900, 580),
 "rangee regle 1 - bordure gauche":     (456, 880, 536, 580),
 "rangee regle 2 - fond":               (700, 975, 900, 690),
 "voyant regle 1":                      (490, 877, 574, 578),
 "reflet du miroir (sur fond carte)":   (390, 907, 460, 636),
}
def med5(px,x,y):
    v=[px[x+dx,y+dy] for dx in range(-2,3) for dy in range(-2,3)]
    return tuple(sorted(c[i] for c in v)[12] for i in range(3))
ir=Image.open(REF).convert("RGB"); ic=Image.open(CAP).convert("RGB")
print("REF",ir.size,"CAP",ic.size)
pr,pc=ir.load(),ic.load()
print(f"{'sonde':36s} {'REF':>16s} {'CAP':>16s}  {'delta':>16s}")
for n,(xr,yr,xc,yc) in P.items():
    a=med5(pr,xr,yr); b=med5(pc,xc,yc); d=tuple(b[i]-a[i] for i in range(3))
    f="  HORS TOL" if max(abs(x) for x in d)>6 else ""
    print(f"{n:36s} {str(a):>16s} {str(b):>16s}  {str(d):>16s}{f}")
