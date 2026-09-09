# m21 : MASSE VISUELLE d'un marqueur = nb de px dont la luminance depasse de +20 celle
# du fond de l'ilot, dans une meme fenetre de peinture (repere reference, reporte).
# C'est la grandeur qui decide de l'ordre de lecture, pas le contraste d'un trait.
# Controle positif : une fenetre SANS marqueur doit rendre des masses voisines des 2 cotes.
from PIL import Image
import statistics
S,DX,DY=1.0225,-12,8
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
def Lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def masse(px,x0,y0,x1,y1,fond):
    return sum(1 for y in range(y0,y1) for x in range(x0,x1) if Lum(px[x,y])>fond+20)
def fenetre(rx0,ry0,rx1,ry1,fondref,fondcap,nom):
    mr=masse(rp,rx0,ry0,rx1,ry1,fondref)
    cx0,cy0,cx1,cy1=int(S*rx0+DX),int(S*ry0+DY),int(S*rx1+DX),int(S*ry1+DY)
    mc=masse(cp,cx0,cy0,cx1,cy1,fondcap)
    aire=(rx1-rx0)*(ry1-ry0)
    print(f"  {nom:26s} REF {mr:6d} px ({100*mr/aire:5.1f}%)   JEU {mc:6d} px ({100*mc/(aire*S*S):5.1f}%)   x{mc/max(mr,1):5.2f}")
    return mr,mc
print("\nfenetres de 200x70 centrees sur le marqueur (repere reference)")
fenetre(70,440,290,510, Lum((59,51,33)), Lum((8,14,20)),  'LES BASSINS')
fenetre(420,665,740,715, Lum((86,77,62)), Lum((29,37,56)),'HAUTES-MARCHES')
fenetre(70,900,300,950, Lum((29,37,56)), Lum((29,37,56)), 'SAINT-BRAND')
fenetre(60,1355,280,1400,Lum((26,35,51)),Lum((26,34,50)), 'LE TREILLIS')
fenetre(390,1893,640,1945,Lum((20,26,39)),Lum((20,26,39)),'LES FRICHES')
print("\nCONTROLE POSITIF : fenetres SANS marqueur (meme taille)")
fenetre(70,1050,290,1120, Lum((24,64,82)), Lum((23,64,82)), 'fleuve, sans marqueur')
fenetre(600,1500,820,1570, Lum((24,30,46)), Lum((24,31,47)), 'ilot nu, sans marqueur')

print("\nCONTROLES POSITIFS SUPPLEMENTAIRES (le 2e ci-dessus tombait sur le bord du halo or")
print("de la maquette : il n'etait donc PAS un temoin valide -- rejete, remplace ici)")
fenetre(100,1270,320,1340, Lum((26,35,51)), Lum((26,34,50)), 'ilot nu sous le fleuve')
fenetre(620,1230,840,1300, Lum((24,30,46)), Lum((24,31,47)), 'ilot nu rive sud')
fenetre(150,600,370,670,  Lum((24,30,41)), Lum((24,30,41)),  'ilot nu LA COLONNE haut')
