# -*- coding: utf-8 -*-
"""Absences : .dm-penal (#2e2114 / bord #8a6a22) et filet 2px de .dm-bas (#2c3640) dans la capture.
Controle POSITIF de la sonde : les MEMES seuils doivent TROUVER, dans la capture, des jetons dont on
sait qu'ils y sont (#241c11 du CTA, #3c3e35 des cartes) -> la sonde n'est pas muette par construction.
Controle POSITIF sur la REFERENCE pour le filet .dm-bas."""
from PIL import Image
def compte(px,W,H,cible,tol,pas=1,zone=None):
    x0,y0,x1,y1 = zone if zone else (0,0,W,H)
    n=0; ys=set()
    for y in range(y0,y1,pas):
        for x in range(x0,x1,pas):
            p=px[x,y]
            if all(abs(p[i]-cible[i])<=tol for i in range(3)): n+=1; ys.add(y)
    return n,(min(ys),max(ys)) if ys else None
C=Image.open("capture-1080x2400.png").convert('RGB'); pc=C.load(); W,H=C.size
R=Image.open("reference-1080x2102.png").convert('RGB'); pr=R.load(); W2,H2=R.size
print("OUVERT cap %dx%d  ref %dx%d"%(W,H,W2,H2))
print()
print("=== sonde : jetons DONT ON SAIT qu'ils sont dans la capture (controle positif) ===")
for nom,hexa in [("#241c11 fond CTA",(36,28,17)),("#3c3e35 bord de carte",(60,62,53)),("#141a21 fond dm-bas",(20,26,33))]:
    n,r=compte(pc,W,H,hexa,6,2,(0,145,1080,2152))
    print("   %-24s n=%6d  lignes y=%s"%(nom,n,r))
print()
print("=== sonde : jetons de .dm-penal, cherches dans TOUTE la zone de contenu ===")
for nom,hexa,tol in [(".dm-penal fond #2e2114",(46,33,20),8),(".dm-penal bord #8a6a22",(138,106,34),12),(".dm-penal texte #e8d3a4",(232,211,164),12)]:
    n,r=compte(pc,W,H,hexa,tol,1,(0,145,1080,2152))
    print("   %-28s (tol %2d) n=%6d  lignes y=%s"%(nom,tol,n,r))
print()
print("=== filet 2px de .dm-bas #2c3640 ===")
n,r=compte(pr,W2,H2,(44,54,64),8,1,(0,1700,1080,1900))
print("   REFERENCE [controle positif] n=%6d  lignes y=%s"%(n,r))
n,r=compte(pc,W,H,(44,54,64),8,1,(0,1700,1080,1900))
print("   CAPTURE                       n=%6d  lignes y=%s"%(n,r))
n,r=compte(pc,W,H,(44,54,64),8,1,(0,145,1080,2152))
print("   CAPTURE, zone de contenu ENTIERE n=%6d  lignes y=%s"%(n,r))
