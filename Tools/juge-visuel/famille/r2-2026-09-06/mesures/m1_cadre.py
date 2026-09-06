# m1 — cadre : trouver la FEUILLE (panneau de contenu) dans la capture, et son homologue dans la reference.
# Controle positif : la largeur de la reference DOIT etre 1120 px == 560 CSS x2.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('REF', ref.size, 'CAP', cap.size)
rp=ref.load(); cp=cap.load()

# --- profil vertical de la capture : luminance moyenne par ligne, sur une bande centrale
def lum(c): return 0.2126*c[0]+0.7152*c[1]+0.0722*c[2]
W,H=cap.size
print('\n-- capture : colonne x=5 (marge gauche) et x=540 (centre), luminance par tranche de 50 --')
for y in range(0,H,50):
    print(y, cap.getpixel((5,y)), cap.getpixel((30,y)), cap.getpixel((540,y)))
