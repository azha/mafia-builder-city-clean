# m08 : report des 18 rects de plaque de la CAPTURE dans le repere de la REFERENCE
# (inverse de m04 : x = (X+12)/1.0225 ; y = (Y-8)/1.0225) -> une image de controle.
# Sert a repondre a "un marqueur hors de son quartier ?" et "chevauchement ?".
from PIL import Image, ImageDraw
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB')
print(f"ouvert reference-1080x2102.png -> {ref.size}")
plaques=[(835,462,1011,495),(462,479,638,512),(78,483,254,516),(853,682,1029,714),
(492,703,668,736),(91,709,267,742),(841,940,1017,973),(94,943,270,975),(484,945,660,978),
(76,1402,252,1435),(839,1406,1015,1440),(463,1421,639,1454),(829,1666,1005,1699),
(63,1680,240,1713),(441,1687,617,1720),(816,1943,993,1975),(75,1955,251,1992),(440,1960,616,1993)]
d=ImageDraw.Draw(ref)
print(f"{'#':>3} {'rect capture':>26} -> {'rect dans la reference':>26}")
for i,(X0,Y0,X1,Y1) in enumerate(plaques,1):
    x0=(X0-DX)/S; x1=(X1-DX)/S; y0=(Y0-DY)/S; y1=(Y1-DY)/S
    d.rectangle([x0,y0,x1,y1], outline=(255,60,60), width=3)
    print(f"{i:>3} ({X0:4d},{Y0:4d},{X1:4d},{Y1:4d}) -> ({x0:6.1f},{y0:6.1f},{x1:6.1f},{y1:6.1f})")
ref.save('mesures/vues/overlay_plaques_sur_ref.png')
ref.resize((540,1051),Image.LANCZOS).save('mesures/vues/overlay_half.png')
print("ecrit mesures/vues/overlay_plaques_sur_ref.png")
