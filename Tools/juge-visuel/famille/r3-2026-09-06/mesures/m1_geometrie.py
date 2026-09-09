# m1 — geometrie brute : bandes verticales/horizontales de la CAPTURE, extension de la feuille,
# gouttiere (chrome haut / dock bas). Controle positif : largeur de l'image == 1080.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("RGB")
ref = Image.open(os.path.join(D, "reference-1120.png")).convert("RGB")
print("capture", cap.size, "reference", ref.size)
assert cap.size == (1080, 2400), "controle positif KO"
assert ref.size == (1120, 1850), "controle positif KO"
c = cap.load(); r = ref.load()
W, H = cap.size

def rowmean(px, w, y):
    s = 0
    for x in range(w):
        p = px[x, y]; s += (p[0]+p[1]+p[2])
    return s/(3.0*w)

# profil horizontal moyen de la capture : reperer chrome haut, corps, dock
print("\n-- profil de luminance par ligne (capture), 1 sur 20 --")
prev = None
for y in range(0, H, 20):
    m = rowmean(c, W, y)
    print(y, round(m,2))
