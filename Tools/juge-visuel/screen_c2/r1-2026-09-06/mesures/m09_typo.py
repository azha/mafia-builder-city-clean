# m09 — typo : decoupage en glyphes (colonnes encrees contigues), avance moyenne, chasse, interlettre
# Controle positif : REF titre = 10 signes 'La filiere' -> le decoupage doit rendre 9 ou 10 groupes
# Controle negatif : le meme decoupage sur une bande vide doit rendre 0 groupe
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def groupes(px,x0,x1,y0,y1,fond,tol):
    ink=[]
    for x in range(x0,x1):
        ink.append(any(max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol for y in range(y0,y1)))
    g=[];cur=None
    for i,v in enumerate(ink):
        x=x0+i
        if v:
            if cur is None: cur=[x,x]
            else: cur[1]=x
        else:
            if cur: g.append(tuple(cur)); cur=None
    if cur: g.append(tuple(cur))
    return g
def rapport(px,tag,x0,x1,y0,y1,fond,tol,ncar):
    g=groupes(px,x0,x1,y0,y1,fond,tol)
    if not g: print("   %-38s AUCUN GROUPE"%tag); return
    larg=[b-a+1 for a,b in g]; gaps=[g[i+1][0]-g[i][1]-1 for i in range(len(g)-1)]
    span=g[-1][1]-g[0][0]+1
    print("   %-38s %2d groupes | span=%4d px | chasse moy=%5.1f | interlettre moy=%5.1f | avance/signe=%5.1f"
          %(tag,len(g),span,sum(larg)/len(larg),(sum(gaps)/len(gaps)) if gaps else 0,span/max(1,ncar-1)))
    print("      groupes:",g[:14])
print("\n### TITRE 'La filiere' (10 signes, espace compris)")
rapport(pr,"REF titre  (fond enseigne)",300,780,505,565,(12,18,28),34,10)
rapport(pc,"CAP titre  (fond boite)",320,780,296,342,(22,22,28),34,10)
print("\n### SOUS-TITRE de l'enseigne")
rapport(pr,"REF 'OU EN EST CHAQUE ETAPE' (22)",270,800,583,612,(13,19,29),30,22)
rapport(pc,"CAP 'LA FILIERE NE REPOND PAS' (24)",290,800,369,398,(22,22,28),30,24)
print("\n### KICKER du panneau bas")
rapport(pr,"REF 'CE QUE LA FILIERE NE DIT PAS'(28)",70,600,1655,1685,(16,23,33),26,28)
rapport(pc,"CAP 'CE QUE LE SERVEUR...VRAIMENT'(33)",70,700,1818,1848,(22,22,28),26,33)
print("\n### CONTROLE NEGATIF : bande vide de la capture")
rapport(pc,"CAP vide y=1000..1060",100,900,1000,1060,(13,13,13),26,10)
