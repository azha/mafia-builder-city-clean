"""11 - AIRE COLOREE de la zone de contenu (saturation HSV > 0.35 ET valeur > 0.30),
et repartition par famille de teinte. C'est la mesure de l'identite 'trois pistes colorees'.
Controle positif : les 12 crans de la reference occupent 12 x 245 x 21 = 61 740 px, dont 6
colores (2 or + 3 ambre + 1 vert) = 30 870 px ; la mesure doit retrouver cet ordre de grandeur
dans la bande y 970..1090. Controle negatif : la zone vide y 1250..1500 doit rendre ~0 px colore."""
from PIL import Image, ImageColor
import colorsys
def aire(path, box, nom):
    im=Image.open(path).convert('RGB'); print(f"ouvre {path}: {im.size}")
    z=im.crop(box); p=z.load(); fam={}
    n=0
    for y in range(z.height):
        for x in range(z.width):
            r,g,b=p[x,y]
            h,s,v=colorsys.rgb_to_hsv(r/255,g/255,b/255)
            if s>0.35 and v>0.30:
                n+=1
                d=int(h*360)
                k=("rouge" if d<15 or d>=345 else "orange" if d<45 else "or/jaune" if d<70
                   else "vert" if d<170 else "cyan" if d<200 else "bleu" if d<260 else "violet")
                fam[k]=fam.get(k,0)+1
    print(f"  {nom}: aire coloree = {n} px  ({100.0*n/(z.width*z.height):.2f}% de la zone)")
    for k,v in sorted(fam.items(), key=lambda t:-t[1]):
        print(f"      {k:10s} {v:7d} px")
    return n
print("[+] CONTROLE POSITIF - REF bande des crans y970..1090")
aire('../reference-1080x2102.png',(80,970,1000,1090),"crans")
print("[-] CONTROLE NEGATIF - REF zone vide y1250..1500")
aire('../reference-1080x2102.png',(80,1250,1000,1500),"vide")
print()
aire('../reference-1080x2102.png',(24,434,1056,2082),"REFERENCE zone de contenu")
aire('../capture-1080x2400.png',(0,143,1080,2193),"CAPTURE zone de contenu")
