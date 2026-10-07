# m15 — couleurs : encre des textes (percentile haut), aplats (mediane), plaque TRANCHER.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def encre(ch,x0,y0,x1,y1,t,q=0.97):
    im=Image.open(ch).convert('RGB'); px=im.load()
    pts=[px[x,y] for y in range(y0,y1) for x in range(x0,x1)]
    pts.sort(key=lum)
    n=len(pts); i=int(n*q)
    # moyenne du decile le plus clair
    sel=pts[int(n*0.95):]
    moy=tuple(round(sum(p[k] for p in sel)/len(sel)) for k in range(3))
    print(f"  {t:40s} [{im.size}] encre(5% plus clairs)={moy}  pic={pts[-1]}  n={n}")
    return moy
def aplat(ch,x0,y0,x1,y1,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    c=[[],[],[]]
    for y in range(y0,y1):
        for x in range(x0,x1):
            p=px[x,y]
            for i in range(3): c[i].append(p[i])
    m=tuple(sorted(v)[len(v)//2] for v in c)
    print(f"  {t:40s} [{im.size}] mediane={m}")
    return m
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("=== ENCRE DES TEXTES ===")
for nom,ch,d in [("REF",R,0),("J1920",J,-10),("J2400",K,+396)]:
    print(f" -- {nom}")
    if nom=="REF":
        encre(R,456,871,620,889,"LA SUITE")
        encre(R,99,948,600,977,"titre 1 serif (or)")
        encre(R,99,1007,414,1031,"sous-titre 1")
        encre(R,660,975,960,1010,"COMMANDER (texte sur or)")
        encre(R,643,1193,940,1214,"VOIR LA VENTE")
        encre(R,744,1453,940,1474,"BLANCHIR")
        encre(R,92,1714,500,1739,"plaque: Lt. Ilm attend vos ordres")
        encre(R,772,1736,960,1759,"TRANCHER")
        encre(R,92,1775,230,1800,"LEGERE")
    if nom=="J1920":
        encre(J,467,866,620,882,"LA SUITE")
        encre(J,97,938,570,966,"titre 1 serif (or)")
        encre(J,96,996,358,1015,"sous-titre 1")
        encre(J,740,960,970,1000,"COMMANDER (texte sur or)")
        encre(J,737,1140,970,1158,"VOIR LA VENTE")
        encre(J,801,1335,950,1353,"BLANCHIR")
        encre(J,79,1537,470,1558,"plaque: Lt. Marr attend vos ordres")
        encre(J,831,1552,1010,1571,"TRANCHER")
        encre(J,79,1573,170,1587,"LEGERE")
print("\n=== APLATS ===")
aplat(R,200,1240,500,1258,"REF  fond du panneau (bande sans texte)")
aplat(J,200,1216,500,1240,"J1920 fond du panneau (bande sans texte)")
aplat(K,200,1622,500,1646,"J2400 fond du panneau (bande sans texte)")
aplat(R,300,1074,800,1076,"REF  separateur 1")
aplat(J,300,1054,800,1056,"J1920 separateur 1")
aplat(R,300,824,800,826,"REF  bord haut du panneau")
aplat(J,300,828,800,831,"J1920 bord haut du panneau")
