# m12 — hauteurs comparees sur des glyphes HOMOLOGUES (meme lettre des deux cotes), bandes isolees
# Controle positif : la bbox ne doit toucher aucun bord de fenetre (garde de coupe, refus sinon)
# Controle negatif : bande vide -> AUCUNE ENCRE
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def g(px,x0,x1,y0,y1,fond,tol,label,rang,lettre):
    def ink(p): return max(abs(p[i]-fond[i]) for i in range(3))>tol
    cols=[x for x in range(x0,x1) if any(ink(px[x,y]) for y in range(y0,y1))]
    if not cols: print("   %-30s AUCUNE ENCRE"%label); return None
    grp=[];cur=[cols[0],cols[0]]
    for x in cols[1:]:
        if x==cur[1]+1: cur[1]=x
        else: grp.append(tuple(cur)); cur=[x,x]
    grp.append(tuple(cur))
    if rang>=len(grp): print("   %-30s groupe #%d absent (%d groupes)"%(label,rang,len(grp))); return None
    a,b=grp[rang]
    rows=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in range(a,b+1))]
    allr=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in cols)]
    coupe=(allr[0]<=y0)or(allr[-1]>=y1-1)or(cols[0]<=x0)or(cols[-1]>=x1-1)
    print("   %-30s '%s' x=%d..%d y=%d..%d  H=%2d px  w=%2d px | %d groupes | coupe:%s"
          %(label,lettre,a,b,rows[0],rows[-1],rows[-1]-rows[0]+1,b-a+1,len(grp),"OUI-REFUS" if coupe else "non"))
    return rows[-1]-rows[0]+1
print("\n### 1. TITRE de l'enseigne — capitale 'L' (meme lettre)")
r=g(pr,300,800,503,570,(12,18,28),34,"REF 'La filiere'",0,"L")
c=g(pc,320,800,292,362,(22,22,28),34,"CAP 'La filiere'",0,"L")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 2. SOUS-TITRE — capitale de tete (O vs L, deux capitales sans jambage)")
r=g(pr,270,800,578,616,(13,19,29),30,"REF 'OU EN EST...'",0,"O")
c=g(pc,290,800,364,402,(22,22,28),30,"CAP 'LA FILIERE NE...'",0,"L")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 3. KICKER du panneau — capitale 'C' (meme lettre)")
r=g(pr,70,700,1652,1690,(16,23,34),26,"REF 'CE QUE LA FILIERE...'",0,"C")
c=g(pc,70,760,1812,1852,(22,22,28),26,"CAP 'CE QUE LE SERVEUR...'",0,"C")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 4. TITRE du panneau — le 'a' (2e glyphe des deux cotes : J-a-mais / P-a-s)")
r=g(pr,70,1035,1700,1760,(16,23,34),26,"REF 'Jamais combien...'",1,"a")
c=g(pc,70,1035,1858,1918,(22,22,28),26,"CAP 'Pas de reponse'",1,"a")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 5. CORPS du panneau — le 'l' initial (meme lettre : 'la ...')")
r=g(pr,80,1035,1766,1804,(16,23,34),26,"REF 'la proprete est la...'",0,"l")
c=g(pc,80,1035,1922,1964,(22,22,28),26,"CAP 'la route n'a rien...'",0,"l")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 6. LIBELLE de compteur — 'E' de ETAPES (meme mot des deux cotes)")
r=g(pr,150,300,752,780,(10,16,24),26,"REF 'ETAPES'",0,"E")
c=g(pc,120,240,540,568,(22,22,28),26,"CAP 'ETAPES'",0,"E")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### 7. CHIFFRE de compteur — '0' (meme signe : 04 / 00)")
r=g(pr,160,250,695,745,(10,16,24),30,"REF '04'",0,"0")
c=g(pc,140,215,480,535,(22,22,28),30,"CAP '00'",0,"0")
print("      => delta %+d px  (%+.1f %%)"%(c-r,100.0*(c-r)/r))
print("\n### CONTROLE NEGATIF")
g(pc,300,800,1000,1100,(13,13,13),26,"CAP vide",0,"-")
