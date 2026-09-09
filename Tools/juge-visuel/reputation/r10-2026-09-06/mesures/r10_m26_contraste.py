# r10-m26 : contraste WCAG texte/fond. Encre = mediane du decile le plus clair de la boite de
#  texte ; fond = mediane d'une fenetre du meme conteneur SANS texte. Hauteur de capitale donnee
#  a cote (mesuree sur une sous-chaine SANS accent ni jambage quand c'est possible).
# Controle positif : le libelle « REGLES DONNEES » a la MEME chaine des deux cotes -> son contraste
#  doit etre quasi identique ; s'il ne l'est pas, l'instrument (ou le fond) a bouge.
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/reputation/r10-2026-09-06/"
IM={"REF":(D+"reference-1080x2102.png",21,452),"CAP":(D+"capture-1080x2400.png",18,18)}
def rl(c):
    o=[]
    for v in c:
        s=v/255.0
        o.append(s/12.92 if s<=0.04045 else ((s+0.055)/1.055)**2.4)
    return 0.2126*o[0]+0.7152*o[1]+0.0722*o[2]
def ratio(a,b):
    x,y=rl(a)+0.05,rl(b)+0.05
    return max(x,y)/min(x,y)
def encre(px,x0,y0,u0,v0,u1,v1):
    vals=[px[x0+u,y0+v] for u in range(u0,u1) for v in range(v0,v1)]
    vals.sort(key=lambda c:-(c[0]+c[1]+c[2]))
    t=vals[:max(1,len(vals)//10)]
    return tuple(sorted(c[i] for c in t)[len(t)//2] for i in range(3))
def fond(px,x0,y0,u,v):
    vals=[px[x0+u+dx,y0+v+dy] for dx in range(-5,6) for dy in range(-5,6)]
    return tuple(sorted(c[i] for c in vals)[len(vals)//2] for i in range(3))
# (nom, boite texte REF, fond REF, boite texte CAP, fond CAP)
T=[("titre « Le miroir »",(306,61,723,109),(60,80),(314,63,734,109),(60,80)),
   ("sous-titre enseigne",(127,137,903,178),(60,120),(138,140,906,184),(60,124)),
   ("chiffres « 00 » f1",(149,272,218,311),(60,290),(154,266,218,305),(60,284)),
   ("libelle « REGLES DONNEES » (CONTROLE +)",(66,328,301,347),(60,315),(69,323,304,342),(60,310)),
   ("carte : « LIEUTENANT »",(190,488,355,504),(100,470),(185,473,349,489),(95,462)),
   ("carte : « Il vous ecoute »",(153,981,393,1007),(100,950),(142,975,390,1001),(95,945)),
   ("verdict « Pas encore »",(523,438,739,466),(523,415),(517,424,736,452),(517,410)),
   ("en-tete « ce qu il a … »",(775,447,878,470),(960,430),(783,451,984,475),(760,430)),
   ("tuile 2 : titre",(553,687,852,712),(940,700),(544,645,842,668),(940,655)),
   ("tuile 2 : sous-titre",(553,716,852,742),(940,700),(544,674,842,698),(940,655)),
   ("pann : sur-titre",(69,1228,655,1247),(80,1210),(66,1240,658,1260),(80,1222)),
   ("pann : « Rien n a encore deteint »",(69,1269,684,1308),(950,1290),(66,1280,687,1319),(950,1300)),
   ("pann : paragraphe",(69,1338,932,1362),(950,1350),(66,1346,926,1370),(950,1350)),
   ("CTA",(212,1527,823,1557),(80,1545),(219,1533,826,1562),(80,1550))]
L={k:Image.open(p).convert("RGB") for k,(p,_,_) in IM.items()}
for k,im in L.items(): print(f"{k} taille={im.size}")
P={"REF":(L["REF"].load(),21,452),"CAP":(L["CAP"].load(),18,18)}
print(f"\n{'texte':42s} {'REF encre':>16s}{'/fond':>16s} {'ratio':>6s} | {'CAP encre':>16s}{'/fond':>16s} {'ratio':>6s}")
for nom,br,fr,bc,fc in T:
    a=encre(*P["REF"],*br); fa=fond(*P["REF"],*fr)
    b=encre(*P["CAP"],*bc); fb=fond(*P["CAP"],*fc)
    print(f"{nom:42s} {str(a):>16s}{str(fa):>16s} {ratio(a,fa):6.2f} | {str(b):>16s}{str(fb):>16s} {ratio(b,fb):6.2f}")
