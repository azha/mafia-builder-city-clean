# m2 — couleurs d'aplat : mediane d'une fenetre, >=3px de tout bord.
# Controle positif : la couleur de fond de carte de la REFERENCE doit valoir le jeton CSS #241c14 (36,28,20).
# Controle negatif : la meme mesure sur la carte VISEE doit donner #2e2114 (46,33,20) -> different.
from PIL import Image

def med(im, x0,y0,x1,y1):
    px=im.load(); R=[];G=[];B=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]; R.append(p[0]);G.append(p[1]);B.append(p[2])
    R.sort();G.sort();B.sort();n=len(R)//2
    return (R[n],G[n],B[n])

ref=Image.open('reference-1080x2102.png').convert('RGB'); print('ref',ref.size)
cap=Image.open('capture-1080x2400.png').convert('RGB'); print('cap',cap.size)

print("\n== REFERENCE ==")
zones_ref = {
 'fond .cfl6 haut (sous entete)': (60,1010,300,1030),
 'fond .cfl6 bas (entre cartes)': (60,1255,300,1263),
 'carte fam #2 (Tarcum) fond'   : (700,1300,860,1360),
 'carte fam #3 (Gorge) fond'    : (700,1480,860,1540),
 'carte fam #1 VISEE fond'      : (700,1120,860,1180),
 'entete fond'                  : (700,460,900,480),
 'ordre (serviette) fond'       : (700,700,900,760),
 'bas (.bas) fond'              : (60,1900,200,1930),
 'geste (CTA) fond'             : (700,1960,860,1990),
}
for k,(a,b,c,d) in zones_ref.items(): print(f"  {k:32s} {med(ref,a,b,c,d)}")

print("\n== CAPTURE ==")
zones_cap = {
 'fond ecran (entre cartes)'    : (60,840,300,852),
 'carte fam #1 (La Coil) fond'  : (760,690,940,730),
 'carte fam #2 (Tarcum) fond'   : (760,880,940,920),
 'carte fam #3 (Gorge) fond'    : (760,1070,940,1110),
 'carte fam #4 (Saltline) fond' : (760,1262,940,1300),
 'fond sous le bloc (vide)'     : (400,1800,700,1900),
 'fond haut (sous bandeau)'     : (60,200,300,260),
}
for k,(a,b,c,d) in zones_cap.items(): print(f"  {k:32s} {med(cap,a,b,c,d)}")

print("\n== CONTROLES ==")
print("  jeton CSS .fam background #241c14 =", (0x24,0x1c,0x14))
print("  jeton CSS .fam.visee   #2e2114     =", (0x2e,0x21,0x14))
print("  jeton CSS .entete bg   #20180f     =", (0x20,0x18,0x0f))
print("  jeton CSS .ordre bg    #f2ece0     =", (0xf2,0xec,0xe0))
print("  jeton CSS .bas bg      #141a21     =", (0x14,0x1a,0x21))
