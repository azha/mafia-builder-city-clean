# m45b — coupe VERTICALE du filet du bandeau (epaisseur reelle, anti-crenelage) et
#        profil HORIZONTAL du fondu d'extremite. Sorties collees dans le rapport.
from lib import *
r=load(REF); d=load(DIS24); c=load(CAP19)
print("REF filet, colonne x=900 px (300 CSS)")
for y in range(148,159):
    cc=r.getpixel((900,y)); print(f"   y {y}  {y/S_REF:7.2f} CSS  {cc}  R-B={cc[0]-cc[2]:4d}")
print("\nJEU 2400 filet, colonne x=826 px (300 CSS)")
for y in range(134,146):
    cc=d.getpixel((826,y)); print(f"   y {y}  {y/S_CAP:7.2f} CSS  {cc}  R-B={cc[0]-cc[2]:4d}")
print("\nfondu horizontal du filet (couleur au coeur du trait)")
for xc in (5,20,40,60,100,140,240,300,350,380,388):
    print(f"   x={xc:4d} CSS   CANON {r.getpixel((int(xc*S_REF),154))}   JEU2400 {d.getpixel((int(xc*S_CAP),140))}   JEU1920 {c.getpixel((int(xc*S_CAP),140))}")
