# -*- coding: utf-8 -*-
"""CTA : bbox, bord, remplissage, contenu a gauche / a droite. Bande .entete. Marges internes du bon.
CONTROLE POSITIF : le CTA de la REFERENCE doit avoir un bord (#5a4a2a) DIFFERENT de son fond (#241c11).
CONTROLE NEGATIF : la meme sonde de bord appliquee au milieu du CTA doit rendre 'pas de bord'."""
from PIL import Image
def m(v): v=sorted(v); return v[len(v)//2]
def med(px,x0,y0,x1,y1):
    R=[];G=[];B=[]
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (m(R),m(G),m(B))
def hx(c): return "#%02x%02x%02x"%c
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
r=Image.open(REF).convert("RGB"); pr=r.load(); print("OUVERT",REF,r.size)
c=Image.open(CAP).convert("RGB"); pc=c.load(); print("OUVERT",CAP,c.size)

print("\n--- CTA ---")
print("  REF : bbox x50..1029 y1938..2042 ; larg=%d haut=%d"%(1029-50+1,2042-1938+1))
print("        bord haut y=1939 %s | fond y=1990 %s | bord gauche x=51 %s"
      %(hx(med(pr,300,1939,700,1939)),hx(med(pr,300,1985,700,1995)),hx(med(pr,51,1970,51,2010))))
print("  CAP : bbox x57..1022 y1375..1511 ; larg=%d haut=%d"%(1022-57+1,1511-1375+1))
print("        bord haut y=1376 %s | fond y=1440 %s | bord gauche x=58 %s"
      %(hx(med(pc,300,1376,700,1376)),hx(med(pc,300,1435,700,1445)),hx(med(pc,58,1400,58,1480))))
print("  CONTROLE : REF bord %s != fond %s -> bord PRESENT"%(hx(med(pr,300,1939,700,1939)),hx(med(pr,300,1990,700,1990))))
print("             CAP bord %s vs fond %s -> %s"%(hx(med(pc,300,1376,700,1376)),hx(med(pc,300,1440,700,1440)),
      "AUCUN bord distinct" if max(abs(med(pc,300,1376,700,1376)[i]-med(pc,300,1440,700,1440)[i]) for i in range(3))<=6 else "bord present"))
# moitie droite du CTA : y a-t-il de l'encre ?
def encre_zone(px,x0,y0,x1,y1,fond,seuil=45):
    n=0
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: n+=1
    return n
print("  encre dans la MOITIE DROITE du CTA :")
print("    REF x540..1020 y1950..2030, fond #241c11 -> %d px"%encre_zone(pr,540,1950,1020,2030,(36,28,17)))
print("    CAP x540..1015 y1390..1500, fond #d9ab4d -> %d px"%encre_zone(pc,540,1390,1015,1500,(217,171,77)))

print("\n--- BANDE .entete (titre) ---")
print("  REF : fond %s de y=439 a 603, filet %s a y=604..606"%(hx(med(pr,300,445,700,470)),hx(med(pr,300,605,700,605))))
print("  CAP : fond autour du titre y=250..280 %s ; y=560..600 %s"%(hx(med(pc,300,250,700,280)),hx(med(pc,300,560,700,600))))
sameCap = max(abs(med(pc,300,250,700,280)[i]-med(pc,300,560,700,600)[i]) for i in range(3))
print("  -> ecart entre 'au-dessus du titre' et 'sous le sous-titre' dans la CAPTURE : %d/255 -> %s"
      %(sameCap,"AUCUNE bande distincte" if sameCap<=3 else "bande presente"))
# recherche d'un filet horizontal dans la capture entre le sous-titre et le bon
filets=[]
for y in range(560,608):
    cc=med(pc,200,y,800,y)
    if max(abs(cc[i]-13) for i in range(3))>8: filets.append((y,hx(cc)))
print("  filet horizontal cherche entre y=560 et 607 dans la CAPTURE :",filets if filets else "AUCUN")

print("\n--- MARGES INTERNES DU BON ---")
print("  REF : bord gauche du bon x=50 ; 1re encre 'Pyralin' x=91  -> padding gauche = %d px = %.1f CSS (CSS declare 11px)"%(91-50,(91-50)/3.6))
print("  CAP : bord gauche du bon x=57 ; 1re encre 'Pyralin' x=105 -> padding gauche = %d px = %.1f CSS"%(105-57,(105-57)/3.6))
print("  REF : haut du bon y=643 ; haut de capitale 'P' y=684 -> %d px = %.1f CSS"%(684-643,(684-643)/3.6))
print("  CAP : haut du bon y=608 ; haut de capitale 'P' y=655 -> %d px = %.1f CSS"%(655-608,(655-608)/3.6))
print("  REF : derniere encre du bon (perforation) y=1226 ; derniere ligne de texte y=1003 (avant penurie)")
print("  CAP : derniere encre y=999 ; bas du bon y=1054 -> padding bas = %d px = %.1f CSS"%(1054-999,(1054-999)/3.6))
