import sys; sys.path.insert(0,'.')
from commun import ouvrir, lum, mediane
im = ouvrir('../reference-1080x2102.png'); px=im.load()
print("REF compteur1 : mediane de rangee (fond) y710..807, x58..353")
for y in range(710,808,6):
    v=[lum(px[x,y]) for x in range(58,354)]
    print(f"   y={y}  mediane={mediane(v):.2f}  p10={sorted(v)[len(v)//10]:.2f}  min={min(v):.2f}")
print("REF : mediane de COLONNE, y798..807 (rangees vides), x58..353 par tranches")
for x0 in range(58,354,40):
    v=[lum(px[x,y]) for x in range(x0,min(x0+40,354)) for y in range(798,808)]
    print(f"   x={x0}..{min(x0+39,353)}  mediane={mediane(v):.2f}")
im2 = ouvrir('../capture-1080x2400.png'); px2=im2.load()
print("JEU2400 compteur1 : mediane de rangee y736..832, x57..349")
for y in range(736,833,6):
    v=[lum(px2[x,y]) for x in range(57,350)]
    print(f"   y={y}  mediane={mediane(v):.2f}  p10={sorted(v)[len(v)//10]:.2f}  min={min(v):.2f}")
