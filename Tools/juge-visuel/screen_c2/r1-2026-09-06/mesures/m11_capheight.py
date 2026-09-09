# m11 — hauteur de capitale, fenetres GENEREUSES (le tour precedent avait une fenetre coupante)
# Controle positif : la bbox du 'L' ne doit toucher AUCUN bord de la fenetre (sinon fenetre coupante -> refus)
# Controle negatif : bande vide -> AUCUNE ENCRE
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def glyphe(px,x0,x1,y0,y1,fond,tol,label,rang=0):
    def ink(p): return max(abs(p[i]-fond[i]) for i in range(3))>tol
    cols=[x for x in range(x0,x1) if any(ink(px[x,y]) for y in range(y0,y1))]
    if not cols: print("   %-34s AUCUNE ENCRE"%label); return
    grp=[];cur=[cols[0],cols[0]]
    for x in cols[1:]:
        if x==cur[1]+1: cur[1]=x
        else: grp.append(tuple(cur)); cur=[x,x]
    grp.append(tuple(cur))
    g0,g1=grp[rang]
    rows=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in range(g0,g1+1))]
    allr=[y for y in range(y0,y1) if any(ink(px[x,y]) for x in cols)]
    coupe = (allr[0]<=y0+1) or (allr[-1]>=y1-2) or (cols[0]<=x0+1) or (cols[-1]>=x1-2)
    print("   %-34s glyphe#%d x=%d..%d  H=%d px | encre totale y=%d..%d (h=%d) x=%d..%d | fenetre coupante: %s"
          %(label,rang,g0,g1,rows[-1]-rows[0]+1,allr[0],allr[-1],allr[-1]-allr[0]+1,cols[0],cols[-1],"OUI (REFUS)" if coupe else "non"))
print("\n### TITRE 'La filiere' — glyphe#0 = capitale 'L'")
glyphe(pr,250,850,470,610,(12,18,28),34,"REF titre",0)
glyphe(pc,250,850,270,430,(22,22,28),34,"CAP titre",0)
print("\n### SOUS-TITRE — glyphe#0 (capitale)")
glyphe(pr,250,850,565,635,(13,19,29),30,"REF sous-titre",0)
glyphe(pc,250,850,355,420,(22,22,28),30,"CAP sous-titre",0)
print("\n### KICKER du panneau — glyphe#0 = 'C'")
glyphe(pr,60,700,1640,1700,(16,23,34),26,"REF kicker",0)
glyphe(pc,60,760,1800,1860,(22,22,28),26,"CAP kicker",0)
print("\n### TITRE DU PANNEAU — glyphe#0 = 'J' / 'P'")
glyphe(pr,60,1030,1695,1765,(16,23,34),26,"REF pann titre",0)
glyphe(pc,60,1030,1855,1925,(22,22,28),26,"CAP pann titre",0)
print("\n### CORPS DU PANNEAU — 1re ligne, hauteur d'x approx (glyphe#0)")
glyphe(pr,60,1030,1768,1802,(16,23,34),26,"REF pann corps L1",0)
glyphe(pc,60,1030,1920,1965,(22,22,28),26,"CAP pann corps L1",0)
print("\n### CONTROLE NEGATIF")
glyphe(pc,250,850,1000,1100,(13,13,13),26,"CAP vide",0)
