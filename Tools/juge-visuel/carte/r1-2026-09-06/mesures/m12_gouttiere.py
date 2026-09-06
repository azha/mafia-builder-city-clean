# m12 : gouttiere -- bandeau, contenu, dock, mesures sur la colonne x=8 (aucun contenu
# d'ecran n'y vit) et x=1072. Le contenu de carte est reconnaissable a sa teinte
# (b nettement > r). Le chrome est gris neutre.
from PIL import Image
def L(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
cap=Image.open('capture-1080x2400.png').convert('RGB'); px=cap.load()
print(f"ouvert capture-1080x2400.png -> {cap.size}")
print("colonne x=8, y 200..260 puis 2090..2200 (transitions)")
for y in list(range(200,260))+list(range(2090,2200)):
    p=px[8,y]
    print(f"  y={y:4d} {p}  L={L(p):5.1f}" if y%2==0 else "", end="")
print()
