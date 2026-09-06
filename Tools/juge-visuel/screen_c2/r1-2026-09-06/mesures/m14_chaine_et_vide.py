# m14 — (a) inventaire de la chaine ABSENTE, cote reference ; (b) verification absolue du vide de la capture
# Controle positif : les 4 cuves de la reference doivent rendre 4 couleurs DIFFERENTES et 4 hauteurs croissantes
# Controle negatif : min et max ABSOLUS sur le vide de la capture doivent etre egaux (aplat parfait)
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/screen_c2/r1-2026-09-06/"
ref=Image.open(D+"reference-1080x2102.png").convert("RGB"); pr=ref.load(); print("REF",ref.size)
cap=Image.open(D+"capture-1080x2400.png").convert("RGB"); pc=cap.load(); print("CAP",cap.size)
def hx(c): return "#%02x%02x%02x"%c
print("\n### (a) REFERENCE — les 4 etapes de la filiere")
rows=[(854,995),(1036,1178),(1218,1360),(1401,1542)]
noms=["Le comptoir","La blanchisserie","Le garage","Le notaire"]
for i,(a,b) in enumerate(rows):
    # la cuve est le 1er objet a gauche : trouver sa colonne et le remplissage colore
    # balaye la colonne x=150 (centre de la cuve) du bas de la rangee vers le haut
    col=[]
    for y in range(a,b+1):
        p=pr[150,y]
        col.append((y,p))
    # remplissage = pixels sature (ecart entre canaux > 25)
    fill=[(y,p) for y,p in col if max(p)-min(p)>25 and max(p)>90]
    if fill:
        print("  %-18s rangee y=%d..%d (h=%d) | remplissage y=%d..%d h=%d px | couleur %s"
              %(noms[i],a,b,b-a+1,fill[0][0],fill[-1][0],fill[-1][0]-fill[0][0]+1,hx(pr[150,(fill[0][0]+fill[-1][0])//2])))
    else:
        print("  %-18s rangee y=%d..%d AUCUN REMPLISSAGE trouve"%(noms[i],a,b))
print("  ecarts entre rangees (connecteur .lien) :",[rows[i+1][0]-rows[i][1]-1 for i in range(3)])
# extent horizontal d'une rangee
def hext(px,y,fond,tol,x0,x1):
    l=r=None
    for x in range(x0,x1):
        if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: l=x;break
    for x in range(x1-1,x0-1,-1):
        if max(abs(px[x,y][i]-fond[i]) for i in range(3))>tol: r=x;break
    return l,r
print("  extent horizontal rangee 1 (y=900) :",hext(pr,900,(13,15,17),12,60,1030))
print("  boite .elast : y=825..1596 (h=772)  x=",hext(pr,1000,(13,15,17),12,40,1040))

print("\n### (b) CAPTURE — le vide, verification ABSOLUE (tous les pixels, pas d'echantillonnage)")
x0,x1,y0,y1=0,1080,618,1783
mn=(255,255,255); mx=(0,0,0); n=0
for y in range(y0,y1):
    for x in range(x0,x1):
        p=pc[x,y]; n+=1
        mn=tuple(min(mn[i],p[i]) for i in range(3))
        mx=tuple(max(mx[i],p[i]) for i in range(3))
print("  zone x=%d..%d y=%d..%d  (%d pixels)"%(x0,x1-1,y0,y1-1,n))
print("  min absolu = %s   max absolu = %s   -> %s"%(hx(mn),hx(mx),"APLAT PARFAIT, aucun contenu" if mn==mx else "il existe du contenu"))
print("\n### (c) memes bornes sur la zone homologue de la REFERENCE (controle negatif)")
mn=(255,255,255); mx=(0,0,0)
for y in range(825,1597):
    for x in range(50,1031):
        p=pr[x,y]
        mn=tuple(min(mn[i],p[i]) for i in range(3)); mx=tuple(max(mx[i],p[i]) for i in range(3))
print("  REF zone chaine  min=%s max=%s -> %s"%(hx(mn),hx(mx),"APLAT" if mn==mx else "contenu present"))
