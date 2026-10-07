# m26 — contrastes WCAG des textes contre le fond REELLEMENT sous eux.
# Controle positif : le libelle COMMANDER sur l'or doit sortir identique ref/jeu.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def L(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def ratio(a,b):
    la,lb=L(a),L(b); hi,lo=max(la,lb),min(la,lb)
    return (hi+0.05)/(lo+0.05)
def mes(ch,xt0,yt0,xt1,yt1,xf0,yf0,xf1,yf1,t):
    im=Image.open(ch).convert('RGB'); px=im.load()
    def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
    enc=sorted([px[x,y] for y in range(yt0,yt1) for x in range(xt0,xt1)],key=lum)
    e=enc[int(len(enc)*0.97)]
    fo=sorted([px[x,y] for y in range(yf0,yf1) for x in range(xf0,xf1)],key=lum)
    f=fo[len(fo)//2]
    print(f"  {t:40s} encre={str(e):16s} fond={str(f):16s} contraste={ratio(e,f):.2f}:1")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
print("REFERENCE")
mes(R,99,948,600,977, 200,1000,500,1004,"titre 1 (serif or) / verre")
mes(R,99,1007,414,1031, 200,1045,500,1050,"sous-titre 1 / verre")
mes(R,456,871,620,889, 200,900,500,905,"LA SUITE / verre")
mes(R,643,1193,940,1214, 680,1230,900,1240,"VOIR LA VENTE / fond du bouton")
mes(R,660,975,960,1010, 660,960,960,968,"COMMANDER / or")
mes(R,92,1714,500,1739, 300,1690,500,1700,"plaque: Lt. / plaque")
mes(R,92,1775,230,1800, 300,1780,500,1790,"LEGERE / plaque")
print("JEU 1080x1920")
mes(J,97,938,570,966, 200,975,500,980,"titre 1 (serif or) / verre")
mes(J,96,996,358,1015, 200,1025,500,1030,"sous-titre 1 / verre")
mes(J,467,866,620,882, 200,895,500,900,"LA SUITE / verre")
mes(J,737,1140,970,1158, 760,1180,950,1195,"VOIR LA VENTE / fond du bouton")
mes(J,740,960,970,1000, 740,948,970,954,"COMMANDER / or")
mes(J,79,1537,470,1558, 300,1510,500,1520,"plaque: Lt. / plaque")
mes(J,79,1573,170,1587, 300,1575,500,1585,"LEGERE / plaque")
