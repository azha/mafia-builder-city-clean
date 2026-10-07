# m35 — planche de perception : le MEME contenu de diorama, REF au-dessus, JEU en dessous, 1:1
# apres mise a l'echelle du JEU par 1,0910 (homographie du m18).
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
S=__import__("os").path.dirname(__import__("os").path.abspath(__file__))+"/"
S=__import__("os").path.dirname(__import__("os").path.abspath(__file__))+"/"
R=Image.open(B+"r2-2026-10-07/reference/cadre-4-la-suite.png").convert('RGB')
J=Image.open(B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png").convert('RGB')
print("REF",R.size,"JEU",J.size)
s,dx,dy=1.0910,-48,3
Jb=J.resize((int(J.width*s), int(J.height*s)), Image.LANCZOS)
# fenetre JEU y 300..740, x 60..1020 -> dans la REF : x s*x+dx, y s*y+dy
a=R.crop((int(s*60+dx), int(s*300+dy), int(s*1020+dx), int(s*740+dy)))
b=Jb.crop((int(s*60), int(s*300), int(s*1020), int(s*740)))
print("  REF crop",a.size,"  JEU crop (remis a l'echelle)",b.size)
out=Image.new('RGB',(a.width, a.height+b.height+8),(255,0,0))
out.paste(a,(0,0)); out.paste(b,(0,a.height+8))
out=out.resize((out.width//2, out.height//2), Image.LANCZOS)
out.save(S+"duo_decor.png"); print("  duo_decor.png",out.size)
