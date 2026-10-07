# m25 — le decor transparait-il a travers le panneau ? crop du panneau, luminance x6 (contraste
# etire) pour les DEUX images. Controle : la meme operation sur le fond hors panneau doit saturer.
from PIL import Image, ImageEnhance
import sys
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
S=__import__("os").path.dirname(__import__("os").path.abspath(__file__))+"/"
def boost(ch,box,out,k=9):
    im=Image.open(ch).convert('RGB'); print(ch.split('/')[-1], im.size, "->", box)
    c=im.crop(box).point(lambda v: min(255,int(v*k)))
    c.save(S+out); print("   ",out,c.size)
boost(B+"r2-2026-10-07/reference/cadre-4-la-suite.png",(55,1080,1030,1620),"ref_verre.png")
boost(B+"captures-2026-10-07-apres-r4b/p1_lancement_1080x1920.png",(55,1060,1030,1445),"cap_verre.png")
