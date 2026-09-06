# m10 — remplissage interne des boites : lignes d'encre, marges hautes/basses, espace mort
# Controle positif : REF pann doit montrer 4 lignes d'encre (kicker + titre + 2 lignes de corps)
# Controle negatif : la meme sonde sur la zone vide de la capture doit rendre 0 ligne
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def lignes(px,x0,x1,y0,y1,fond,tol,tag):
    rows=[]
    for y in range(y0,y1):
        n=sum(1 for x in range(x0,x1) if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol)
        rows.append(n>2)
    out=[];cur=None
    for i,v in enumerate(rows):
        y=y0+i
        if v:
            if cur is None: cur=[y,y]
            else: cur[1]=y
        else:
            if cur: out.append(tuple(cur)); cur=None
    if cur: out.append(tuple(cur))
    print("  %s  boite y=%d..%d (h=%d)"%(tag,y0,y1-1,y1-y0))
    print("     %d lignes d'encre : %s"%(len(out),out))
    if out:
        print("     marge haute=%d  marge basse=%d  encre de %d a %d"%(out[0][0]-y0,y1-1-out[-1][1],out[0][0],out[-1][1]))
    return out
print("\n### PANNEAU BAS")
lignes(pr,60,1020,1630,1870,(16,23,34),26,"REF pann")
lignes(pc,60,1020,1784,2116,(22,22,28),26,"CAP pann")
print("\n### COMPTEUR (premiere fenetre)")
lignes(pr,55,358,679,793,(10,16,24),26,"REF fen1")
lignes(pc,50,306,460,618,(22,22,28),26,"CAP fen1")
print("\n### ENSEIGNE")
lignes(pr,60,1020,481,648,(12,18,28),30,"REF enseigne")
lignes(pc,60,1020,267,427,(22,22,28),30,"CAP enseigne")
print("\n### CONTROLE NEGATIF : zone vide de la capture")
lignes(pc,46,1034,700,1700,(13,13,13),26,"CAP vide")
print("\n### CTA / pied : y a-t-il QUOI QUE CE SOIT entre le panneau bas et le dock ?")
lignes(pc,20,1060,2116,2178,(13,13,13),10,"CAP entre pann et dock")
