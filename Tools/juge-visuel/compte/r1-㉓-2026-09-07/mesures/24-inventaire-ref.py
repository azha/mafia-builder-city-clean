# -*- coding: utf-8 -*-
"""24 - Inventaire chiffre de la REFERENCE : carte d'article, etiquette de prix, tablette, voix.
CONTROLE POSITIF : chaque valeur doit retrouver le hex ECRIT dans la CSS a <=6/255.
CONTROLE NEGATIF : deux matieres differentes doivent s'ecarter de plus de 6/255."""
from PIL import Image
import statistics, os
def ouvrir(p):
    im=Image.open(p).convert('RGB'); print("ouvert %-32s %s"%(os.path.basename(p),im.size)); return im
def med(im,box):
    z=im.crop(box); px=list(z.getdata())
    return tuple(int(statistics.median([p[k] for p in px])) for k in range(3))
def ec(a,b): return max(abs(a[i]-b[i]) for i in range(3))
R=ouvrir('../reference-㉓-1080x2102.png')
print()
cas=[("carte .art, haut  #221a20",(150,700,400,720),(34,26,32)),
     ("carte .art, bas   #1a141a",(150,1100,400,1120),(26,20,26)),
     ("bord .art         #3a2530",(40,800,44,900),(58,37,48)),
     ("etiquette .etiq   #efe6d4",(430,1085,470,1100),(239,230,212)),
     ("tablette .planche #3a2e24",(300,1617,700,1623),(58,46,36)),
     ("bandeau voix      #12100e",(60,1840,300,1860),(18,16,14)),
     ("bord voix         #3a2e24",(300,1826,700,1829),(58,46,36))]
for nom,box,attendu in cas:
    c=med(R,box); print("   %-28s mesure=%-16s CSS=%-16s ecart=%d"%(nom,str(c),str(attendu),ec(c,attendu)))
print()
print("   CN  carte .art vs etiquette : ecart =",ec(med(R,(150,700,400,720)),med(R,(430,1085,470,1100))))
print()
print("=== geometrie de la REFERENCE (px, et CSS a x3,6) ===")
for nom,y0,y1 in [("comptoir .compt",434,587),("vitre .vitre",588,1824),("bandeau .voix",1825,2102)]:
    print("   %-18s y=%4d..%4d  h=%4d px = %6.1f CSS"%(nom,y0,y1,y1-y0+1,(y1-y0+1)/3.6))
print("   planche rangee 1   y= 690..1144  h= 455 px = 126.4 CSS")
print("   planche rangee 2   y=1174..1582  h= 409 px = 113.6 CSS")
print("   tablette           y=1616..1625  h=  10 px =   2.8 CSS")
print("   colonnes           x=  40.. 523 et 554..1040  (gap 28 px = 7,8 CSS ; CSS declare 8 px)")
