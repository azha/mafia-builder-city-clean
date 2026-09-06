# r10-m23 : lueurs internes. (a) .fen box-shadow inset 0 0 10px cyan1f -> profil teal depuis le
#  liseré vers l'interieur, dans une colonne SANS texte. (b) pastilles .lum des 4 tuiles.
# Controle positif (a) : au centre de la fenetre (loin des bords) le score teal doit etre ~ egal
#  des deux cotes -> l'instrument ne mesure pas un decalage global de fond.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452,(32,337,253,360),(521,976)),
    "CAP":(D+"capture-1080x2400.png",18,18,(31,339,247,356),(515,989))}
def sc(p): return (p[1]+p[2])/2.0-p[0]
for k,(p,x0,y0,(fu0,fu1,fv0,fv1),(tu0,tu1)) in IM.items():
    im=Image.open(p).convert("RGB"); px=im.load()
    print(f"\n=== {k} taille={im.size}  fenetre 1 u[{fu0},{fu1}] v[{fv0},{fv1}]")
    v=fv0+12   # sous le liseré haut, au-dessus des chiffres
    print("  (a) score teal en descendant depuis le liseré HAUT, colonne u=fu0+20 :")
    print("     "+" ".join(f"d{d}:{sc(px[x0+fu0+20,y0+fv0+d]):+.1f}" for d in (4,6,8,10,14,20,28,40)))
    print("  (b) score teal du CENTRE de la fenetre (CONTROLE +) : "
          f"{sc(px[x0+(fu0+fu1)//2,y0+(fv0+fv1)//2]):+.1f}")
