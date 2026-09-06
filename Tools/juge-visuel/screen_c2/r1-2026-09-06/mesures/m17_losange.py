# m17 — l'ornement en losange de la capture (entre bandeau et enseigne) : existe-t-il dans la reference ?
# Controle positif : l'ornement doit etre trouve dans la capture (on le voit a l'oeil, y~215..232)
# Controle negatif : la meme sonde sur la reference dans la bande homologue (juste au-dessus du panneau)
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def bbox(px,x0,x1,y0,y1,fond,tol,tag):
    cs=[];rs=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: cs.append(x);rs.append(y)
    if not cs: print("  %-34s RIEN"%tag); return
    print("  %-34s x=%d..%d (w=%d)  y=%d..%d (h=%d)  couleur centre=%s"
          %(tag,min(cs),max(cs),max(cs)-min(cs)+1,min(rs),max(rs),max(rs)-min(rs)+1,
            "#%02x%02x%02x"%px[(min(cs)+max(cs))//2,(min(rs)+max(rs))//2]))
bbox(pc,0,1080,150,266,(13,13,13),12,"CAP entre bandeau et enseigne")
bbox(pr,3,1077,400,433,(11,16,22),12,"REF juste au-dessus du panneau")
