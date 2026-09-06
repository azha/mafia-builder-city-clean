# m13 — REPRISE de m09 et des lignes refusees de m12 : bandes elargies, garde de coupe sur CHAQUE mesure
# (m09 mesurait le titre de la CAPTURE dans une fenetre qui coupait le pied du 'L' : chasse fausse)
# Controle positif : le 'L' du titre doit rendre la MEME largeur qu'en m12 (41 px cote capture, 40 cote ref)
# Controle negatif : bande vide -> AUCUN GROUPE
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def analyse(px,x0,x1,y0,y1,fond,tol,label,ncar,cap_h=None):
    def ink(p): return max(abs(p[i]-fond[i]) for i in range(3))>tol
    cols=[x for x in range(x0,x1) if any(ink(px[x,y]) for y in range(y0,y1))]
    if not cols: print("   %-32s AUCUN GROUPE"%label); return None
    allr=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in cols)]
    coupe=(allr[0]<=y0)or(allr[-1]>=y1-1)or(cols[0]<=x0)or(cols[-1]>=x1-1)
    grp=[];cur=[cols[0],cols[0]]
    for x in cols[1:]:
        if x==cur[1]+1: cur[1]=x
        else: grp.append(tuple(cur)); cur=[x,x]
    grp.append(tuple(cur))
    larg=[b-a+1 for a,b in grp]; gaps=[grp[i+1][0]-grp[i][1]-1 for i in range(len(grp)-1)]
    span=grp[-1][1]-grp[0][0]+1
    ch=sum(larg)/len(larg); it=(sum(gaps)/len(gaps)) if gaps else 0
    s="   %-32s %2dgr span=%4d chasse=%5.1f interlettre=%5.1f avance/signe=%5.1f | 1er glyphe w=%d | coupe:%s"%(
        label,len(grp),span,ch,it,span/max(1,ncar-1),larg[0],"OUI-REFUS" if coupe else "non")
    if cap_h: s+=" | /H(%d): chasse=%.3f interlettre=%.3f avance=%.3f"%(cap_h,ch/cap_h,it/cap_h,(span/max(1,ncar-1))/cap_h)
    print(s)
    return (span,ch,it,larg[0])
print("\n### TITRE 'La filiere' (10 signes) — bandes corrigees")
analyse(pr,300,800,503,570,(12,18,28),34,"REF titre  H(L)=45",10,45)
analyse(pc,320,800,292,362,(22,22,28),34,"CAP titre  H(L)=51",10,51)
print("\n### SOUS-TITRE")
analyse(pr,270,800,578,616,(13,19,29),30,"REF sous-titre H=18 (22 sg)",22,18)
analyse(pc,290,800,364,402,(22,22,28),30,"CAP sous-titre H=20 (24 sg)",24,20)
print("\n### KICKER du panneau")
analyse(pr,70,700,1652,1690,(16,23,34),26,"REF kicker H=16 (28 sg)",28,16)
analyse(pc,70,760,1812,1852,(22,22,28),26,"CAP kicker H=21 (33 sg)",33,21)
print("\n### LIBELLE 'ETAPES' (meme mot, 6 signes)")
analyse(pr,150,300,750,782,(10,16,24),26,"REF ETAPES",6)
analyse(pc,118,245,534,572,(22,22,28),26,"CAP ETAPES",6)
print("\n### Lignes refusees de m12, bandes elargies")
def g1(px,x0,x1,y0,y1,fond,tol,label,rang):
    def ink(p): return max(abs(p[i]-fond[i]) for i in range(3))>tol
    cols=[x for x in range(x0,x1) if any(ink(px[x,y]) for y in range(y0,y1))]
    if not cols: print("   %-32s AUCUNE ENCRE"%label); return None
    allr=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in cols)]
    coupe=(allr[0]<=y0)or(allr[-1]>=y1-1)
    grp=[];cur=[cols[0],cols[0]]
    for x in cols[1:]:
        if x==cur[1]+1: cur[1]=x
        else: grp.append(tuple(cur)); cur=[x,x]
    grp.append(tuple(cur))
    a,b=grp[rang]
    rows=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in range(a,b+1))]
    print("   %-32s glyphe#%d x=%d..%d H=%d w=%d | coupe:%s"%(label,rang,a,b,rows[-1]-rows[0]+1,b-a+1,"OUI-REFUS" if coupe else "non"))
    return rows[-1]-rows[0]+1
r=g1(pr,70,1035,1690,1768,(16,23,34),26,"REF pann titre 'a'",1)
c=g1(pc,70,1035,1852,1922,(22,22,28),26,"CAP pann titre 'a'",1)
print("      => 'a' du titre de panneau : %+d px (%+.1f %%)"%(c-r,100.0*(c-r)/r))
r=g1(pr,80,1035,1762,1806,(16,23,34),26,"REF pann corps 'l'",0)
c=g1(pc,80,1035,1918,1966,(22,22,28),26,"CAP pann corps 'l'",0)
print("      => 'l' du corps de panneau : %+d px (%+.1f %%)"%(c-r,100.0*(c-r)/r))
r=g1(pr,150,300,748,784,(10,16,24),26,"REF 'ETAPES' E",0)
c=g1(pc,118,245,532,574,(22,22,28),26,"CAP 'ETAPES' E",0)
print("      => 'E' du libelle : %+d px (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### CONTROLE NEGATIF")
analyse(pc,300,800,1000,1100,(13,13,13),26,"CAP vide",10)
