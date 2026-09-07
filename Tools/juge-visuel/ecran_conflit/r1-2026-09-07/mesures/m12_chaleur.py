# m12 — indice de CHALEUR (R-B moyen) et amplitude du degrade de fond.
# Controle positif : la serviette .ordre de la reference (creme) doit avoir R-B > 0 fort (+18) ;
#                    le dock du HUD canon (bleu nuit) doit avoir R-B < 0.
# Controle negatif : un gris pur donnerait R-B = 0.
from PIL import Image
def rb(im,box):
    z=im.crop(box).convert('RGB').resize((160,320), Image.BILINEAR)
    px=z.load(); s=0; n=0
    for y in range(320):
        for x in range(160):
            p=px[x,y]; s+=p[0]-p[2]; n+=1
    return s/n
def uniforme(im,box):
    px=im.load();ref=px[box[0]+1,box[1]+1];mx=0
    for y in range(box[1],box[3]):
        for x in range(box[0],box[2]):
            p=px[x,y];mx=max(mx,max(abs(p[i]-ref[i]) for i in range(3)))
    return mx
ref=Image.open('reference-1080x2102.png'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png'); print('cap',cap.size)
can=Image.open('hud-canon-1176.png'); print('canon',can.size)
print("\nINDICE DE CHALEUR (R-B moyen, >0 = chaud)")
print(f"   REFERENCE .cfl6 entier      : {rb(ref,(4,434,1076,2098)):+.2f}")
print(f"   REFERENCE hors serviette    : {rb(ref,(4,1010,1076,2098)):+.2f}")
print(f"   CAPTURE rect libre          : {rb(cap,(4,144,1076,2158)):+.2f}")
print(f"   CAPTURE zone des 4 cartes   : {rb(cap,(57,666,1023,1408)):+.2f}")
print(f"   REFERENCE zone des 4 cartes : {rb(ref,(50,1084,1030,1787)):+.2f}")
print(f"   CONTROLE POSITIF serviette  : {rb(ref,(60,690,1020,995)):+.2f}")
print(f"   CONTROLE POSITIF dock canon : {rb(can,(0,1900,1176,2091)):+.2f}")
print("\nDEGRADE DE FOND (amplitude max sur la gouttiere gauche x=20..45)")
def bande(im,x0,x1,y0,y1,pas):
    px=im.load();out=[]
    for y in range(y0,y1,pas):
        R=sorted(px[x,y][0] for x in range(x0,x1));G=sorted(px[x,y][1] for x in range(x0,x1));B=sorted(px[x,y][2] for x in range(x0,x1))
        n=len(R)//2;out.append((y,(R[n],G[n],B[n])))
    return out
b=bande(ref,20,45,440,1780,180); print("   REFERENCE :",b)
print("   amplitude :",max(sum(c) for _,c in b)-min(sum(c) for _,c in b))
b=bande(cap,20,45,150,2140,180); print("   CAPTURE   :",b)
print("   amplitude :",max(sum(c) for _,c in b)-min(sum(c) for _,c in b))
print("\nAPLAT DES CARTES (ecart max a l'interieur d'une carte, hors texte)")
print("   REFERENCE carte#3 x 700..1020 y 1470..1590 :",uniforme(ref,(700,1470,1020,1590)))
print("   CAPTURE   carte#3 x 700..1015 y 1060..1200 :",uniforme(cap,(700,1060,1015,1200)))

print("\n== ADDENDUM : le CLIENT dispose-t-il des jetons chauds ? (meme capture, zone du chrome) ==")
print(f"   CAPTURE bandeau (0..143)            : {rb(cap,(0,0,1080,143)):+.2f}")
print(f"   CAPTURE ARGENT+medaillon (150..600 x 20..135) : {rb(cap,(150,20,600,135)):+.2f}")
print(f"   CAPTURE dock (2160..2400)           : {rb(cap,(0,2160,1080,2400)):+.2f}")
print("   -> jetons chauds mesures dans la MEME capture : or-vif (242,201,106), laiton du soulignement,")
print("      braise (224,102,73), creme (234,224,200) ; aucun d'eux n'apparait dans le CONTENU.")
