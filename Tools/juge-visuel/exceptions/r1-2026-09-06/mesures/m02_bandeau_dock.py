# m02 — bandeau haut et dock bas de la CAPTURE ; vérif que la capture "sans chrome" en est bien dépourvue.
from util import *
print("== m02 bandeau / dock ==")
cap = ouvrir(CAP); capsc = ouvrir(CAPSC)
pc, ps = cap.load(), capsc.load()

def bande_non_noire(px, y0, y1, seuil=8):
    out=[]
    for y in range(y0,y1):
        n=0; mx=0
        for x in range(0,1080,2):
            c=px[x,y]; L=(c[0]*299+c[1]*587+c[2]*114)/1000
            if L>seuil: n+=1
            mx=max(mx,L)
        out.append((y,n,round(mx,1)))
    return out

print("  -- capture DÉCLARÉE sans chrome : lignes non-noires en haut (y<260) et en bas (y>2100) ?")
h = [t for t in bande_non_noire(ps,0,260) if t[1]>20]
b = [t for t in bande_non_noire(ps,2100,2400) if t[1]>20]
print(f"     haut: {len(h)} lignes avec >20 px clairs ; bas: {len(b)} lignes. (0/0 ⇒ déclaration VÉRIFIÉE)")
print(f"     max luminance haut = {max(t[2] for t in bande_non_noire(ps,0,260))}, bas = {max(t[2] for t in bande_non_noire(ps,2100,2400))}")

print("  -- capture SOUS chrome : bornes du bandeau")
# la ligne rouge de séparation : chercher la ligne où R-G est max sur toute la largeur
best=None
for y in range(100,240):
    s=0
    for x in range(0,1080,2):
        c=pc[x,y]; s += max(0, c[0]-max(c[1],c[2]))
    if best is None or s>best[1]: best=(y,s)
print(f"     ligne la plus ROUGE (R-max(G,B)) entre y=100 et 240 : y={best[0]} (score {best[1]})")
for y in range(best[0]-4,best[0]+5):
    print(f"       y={y} : centre-gauche {mediane_fenetre(cap,60,y,2)}  centre {mediane_fenetre(cap,900,y,2)}")

# bas du bandeau : première ligne, sous la ligne rouge, où tout est noir sur 1080 sauf le médaillon
print("  -- lignes 200..240 : nb de px de luminance > 10")
for y in range(196,244,2):
    n=sum(1 for x in range(0,1080,2) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)/1000)(pc[x,y])>10)
    print(f"       y={y} : {n}/540")

print("  -- dock : lignes 2150..2400, nb de px luminance > 10 (capture sous chrome)")
for y in range(2150,2400,10):
    n=sum(1 for x in range(0,1080,2) if (lambda c:(c[0]*299+c[1]*587+c[2]*114)/1000)(pc[x,y])>10)
    print(f"       y={y} : {n}/540  med(x=540)={mediane_fenetre(cap,540,y,2)}")
