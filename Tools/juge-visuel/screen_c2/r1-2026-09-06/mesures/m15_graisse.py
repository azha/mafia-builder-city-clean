# m15 — graisse : epaisseur du fut vertical du 'L' du titre, normalisee par la hauteur de capitale
# Controle positif : la mesure du fut doit tomber DANS le glyphe (bbox connue du 'L')
# Controle negatif : la meme sonde 10 px a gauche du glyphe doit rendre 0
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def fut(px,x0,x1,y,fond,tol,tag,H):
    n=0; xs=[]
    for x in range(x0,x1):
        if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: n+=1; xs.append(x)
    print("   %-28s y=%d  fut=%d px  x=%s..%s  | fut/H = %.3f"%(tag,y,n,xs[0] if xs else "-",xs[-1] if xs else "-",n/H))
    return n
print("\n### FUT VERTICAL du 'L' (mi-hauteur, avant l'empattement du pied)")
# REF 'L' x=326..365 y=515..559 -> mi-hauteur y=535
fut(pr,320,372,535,(12,18,28),60,"REF titre 'L' H=45",45)
# CAP 'L' x=344..384 y=305..355 -> mi-hauteur y=328
fut(pc,338,392,328,(22,22,28),60,"CAP titre 'L' H=51",51)
print("\n### FUT du 'P'/'J' du titre de panneau (REF 'Jamais' J ; CAP 'Pas' P) — mi-hauteur")
fut(pr,80,115,1725,(16,23,34),50,"REF pann 'J' H=44",44)
fut(pc,80,118,1885,(22,22,28),50,"CAP pann 'P' H=35",35)
print("\n### FUT du 'E' de ETAPES (libelle de compteur)")
fut(pr,152,172,765,(10,16,24),40,"REF 'E' H=18",18)
fut(pc,122,143,550,(22,22,28),40,"CAP 'E' H=22",22)
print("\n### CONTROLE NEGATIF (10 px a gauche du 'L', hors glyphe)")
fut(pr,300,320,535,(12,18,28),60,"REF hors glyphe",45)
fut(pc,315,338,328,(22,22,28),60,"CAP hors glyphe",51)
