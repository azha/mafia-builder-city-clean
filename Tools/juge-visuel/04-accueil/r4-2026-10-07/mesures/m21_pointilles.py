# m21 — le SOULIGNE POINTILLE de la maquette : present ou absent en jeu ?
# Un pointille = une bande de 3-4 px, detachee ~8 px sous la ligne de base, dont le profil
# horizontal ALTERNE (encre/vide) avec une periode courte. On compte les transitions.
from PIL import Image
B="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def sonde(ch,x0,x1,y0,y1,t,seuil=40):
    im=Image.open(ch).convert('RGB'); px=im.load()
    best=None
    for y in range(y0,y1):
        v=[1 if lum(px[x,y])>seuil else 0 for x in range(x0,x1)]
        tr=sum(1 for i in range(1,len(v)) if v[i]!=v[i-1])
        if best is None or tr>best[0]: best=(tr,y,sum(v))
    tr,y,n=best
    print(f"  {t:44s} [{im.size}] ligne la plus alternee y={y} : {tr} transitions, {n} px d'encre sur {x1-x0}")
R=B+"r2-2026-10-07/reference/cadre-4-la-suite.png"
J=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x1920.png"
K=B+"captures-2026-10-07-apres-r3/p1_lancement_1080x2400.png"
print("REFERENCE — bandes situees 5..14 px SOUS la ligne de base")
sonde(R,430,650,890,900,"sous LA SUITE (base 888)")
sonde(R,100,600,980,995,"sous le titre 1 (base 976)")
sonde(R,100,410,1033,1045,"sous le sous-titre 1 (base 1030)")
sonde(R,660,950,1016,1026,"sous COMMANDER (base 1009)")
sonde(R,645,940,1216,1228,"sous VOIR LA VENTE (base 1213)")
sonde(R,745,940,1476,1488,"sous BLANCHIR (base 1473)")
sonde(R,775,960,1762,1774,"sous TRANCHER (base 1758)")
print("JEU 1080x1920 — memes bandes relatives")
sonde(J,430,650,884,896,"sous LA SUITE (base 881)")
sonde(J,95,575,968,982,"sous le titre 1 (base 965)")
sonde(J,95,360,1017,1030,"sous le sous-titre 1 (base 1014)")
sonde(J,725,980,1002,1014,"sous COMMANDER (base 999)")
sonde(J,738,970,1160,1172,"sous VOIR LA VENTE (base 1157)")
sonde(J,802,950,1355,1367,"sous BLANCHIR (base 1352)")
sonde(J,832,1015,1573,1585,"sous TRANCHER (base 1570)")
print("JEU 1080x2400")
sonde(K,430,650,1291,1303,"sous LA SUITE")
sonde(K,95,575,1374,1388,"sous le titre 1")
