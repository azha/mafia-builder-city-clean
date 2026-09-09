# m20 : fiches -- couleur d'encre des noms, ombre portee de la reference,
# couleur du fleuve, du port, du dock peint, pastilles de la legende.
from PIL import Image
import statistics
ref=Image.open('reference-1080x2102.png').convert('RGB'); cap=Image.open('capture-1080x2400.png').convert('RGB')
print(f"ouvert ref -> {ref.size} ; cap -> {cap.size}")
rp,cp=ref.load(),cap.load()
def med(px,x0,y0,x1,y1,pred=None):
    v=[px[x,y] for y in range(y0,y1) for x in range(x0,x1) if pred is None or pred(px[x,y])]
    if not v: return None
    return tuple(int(statistics.median([q[k] for q in v])) for k in range(3)), len(v)
creme=lambda p: p[0]>150 and p[1]>135 and 18<=p[0]-p[2]<=70
print("\nENCRE des noms")
print("  REF (5 mots, pixels creme) :", med(rp,95,440,275,500,creme), med(rp,430,668,725,712,creme))
print("  CAP (pixels blancs dans 2 plaques) :", med(cp,115,488,220,510,lambda p:p[0]>190 and p[1]>190),
                                                med(cp,508,710,655,732,lambda p:p[0]>190 and p[1]>190))
print("\nOMBRE portee du texte REF : bande 3 px sous les glyphes de HAUTES-MARCHES (y 700..706)")
print("  ", med(rp,470,700,700,707))
print("  fond du meme ilot hors texte (y 730..745) :", med(rp,470,730,700,746))
print("\nJETONS")
print("  fleuve REF/CAP                :", med(rp,280,1160,320,1200), med(cp,274,1195,314,1235))
print("  plaque de nom CAP             : (140,140,148) ; pastille 'Libre' de la legende :", med(cp,208,2116,219,2127))
print("  pastille 'Dispute'            :", med(cp,273,2116,284,2127))
print("  pastille 'A vous'             :", med(cp,353,2116,364,2127))
print("  pastille 'Rival'              :", med(cp,429,2116,440,2127))
print("  texte de legende CAP (blanc)  :", med(cp,290,2114,340,2130,lambda p:p[0]>200 and p[1]>200 and p[2]>200))
print("\nDIMENSIONS")
print("  18 plaques : 177 x 34 px = 49,2 x 9,4 CSS (facteur 3,6)")
print("  encre la plus large : PLACE DES COMPTES 158 px ; la plus etroite : ORSEL 48 px")
print("  marge laterale : PLACE DES COMPTES 10/9 px ; ORSEL 65/65 px")
