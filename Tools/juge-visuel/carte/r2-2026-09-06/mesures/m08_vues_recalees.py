# m08 — vues RECALEES : la reference re-echantillonnee dans le repere de la capture, cote a cote.
# Sert de piece a conviction visuelle ; toutes les conclusions restent chiffrees ailleurs.
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
M = os.path.join(D, "mesures")
ref = Image.open(os.path.join(D, "reference-1080x2102.png")).convert("RGB")
cap = Image.open(os.path.join(D, "capture-1080x2400.png")).convert("RGB")
print("OUVERT ref", ref.size, "cap", cap.size)
S, TX, TY = 1.0220, -12.0, 8.0
# reference projetee : taille S*ref puis translation
rw, rh = int(round(1080*S)), int(round(2102*S))
big = ref.resize((rw, rh), Image.LANCZOS)
canvas = Image.new("RGB", (1080, 2400), (0,0,0))
canvas.paste(big, (int(round(TX)), int(round(TY))))
canvas.save(os.path.join(M, "v_reference_recalee.png"))
print("ecrit v_reference_recalee.png", canvas.size)

zones = {
  "bandeENTREPOTS": (0, 830, 1080, 1000),
  "bandeBASSINS":   (0, 330, 1080, 520),
  "LISIERE":        (700, 1480, 1080, 1780),
  "rose":           (880, 500, 1080, 720),
}
for n,(x0,y0,x1,y1) in zones.items():
    a = canvas.crop((int(S*x0+TX), int(S*y0+TY), int(S*x1+TX), int(S*y1+TY)))
    b = cap.crop((int(S*x0+TX), int(S*y0+TY), int(S*x1+TX), int(S*y1+TY)))
    w,h = a.size
    out = Image.new("RGB", (w, h*2+8), (255,0,255))
    out.paste(a, (0,0)); out.paste(b, (0,h+8))
    out.save(os.path.join(M, f"v_{n}_REFhaut_CAPbas.png"))
    print(f"  v_{n}: {w}x{h} chacune")
