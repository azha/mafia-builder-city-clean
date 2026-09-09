#!/usr/bin/env python3
"""02 - Marque les points de sonde sur l'image pour VERIFIER a l'oeil que chaque
sonde est bien sur ce que son nom dit. Une sonde mal placee fabrique un fait faux."""
from PIL import Image, ImageDraw
import os
D = os.path.dirname(__file__)
im = Image.open(os.path.join(D, '..', 'capture-nuit-1080x1920.png')).convert('RGB')
print("taille source :", im.size)
d = ImageDraw.Draw(im)
sondes = {
 "1 lointain_sombre":  (150, 200), "2 lointain_clair": (620, 190),
 "3 sol_vide_diag":    (760, 380), "4 sol_vide_gauche": (120, 470),
 "5 rue":              (330,1180), "6 quai_dalle":      (900,1400),
 "7 eau_plein":        (300,1650), "8 eau_pres_quai":   (760,1560),
 "9 facade":           (500, 810), "10 toit?":          (300, 470),
 "11 usine_toit":      (640,1120),
}
for k,(x,y) in sondes.items():
    d.ellipse([x-12,y-12,x+12,y+12], outline=(255,0,255), width=3)
    d.line([x-20,y,x+20,y], fill=(255,0,255), width=1)
    d.text((x+16,y-8), k, fill=(255,0,255))
    print("%-20s -> (%4d,%4d)" % (k,x,y))
im.save(os.path.join(D,'02_sondes_marquees.png'))
im.crop((0,140,1080,760)).save(os.path.join(D,'02_sondes_haut.png'))
im.crop((0,1050,1080,1750)).save(os.path.join(D,'02_sondes_bas.png'))
print("ecrit : 02_sondes_marquees.png / _haut / _bas")
