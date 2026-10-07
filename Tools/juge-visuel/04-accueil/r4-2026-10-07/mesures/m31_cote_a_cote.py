# m31 — planches de comparaison 1:1 (aucune mise a l'echelle) pour juger la PERCEPTION.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
S=__import__("os").path.dirname(__import__("os").path.abspath(__file__))+"/"
R=Image.open(B+"r2-2026-10-07/reference/cadre-4-la-suite.png").convert('RGB')
J=Image.open(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png").convert('RGB')
print("REF",R.size,"JEU",J.size)
def duo(nom, br, bj):
    a=R.crop(br); b=J.crop(bj)
    h=max(a.height,b.height)
    out=Image.new('RGB',(1080, h*2+10),(255,0,0))
    out.paste(a,(0,0)); out.paste(b,(0,h+10))
    out.save(S+nom); print("  ",nom,out.size,"(haut=REFERENCE, bas=JEU, 1:1, separes par une ligne rouge)")
duo("duo_filet.png",(0,800,1080,870),(0,798,1080,868))
duo("duo_boutons.png",(560,1130,1080,1290),(560,1060,1080,1220))
