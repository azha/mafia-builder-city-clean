# -*- coding: utf-8 -*-
"""MEDIANE d'une fenetre (>=3 px de tout bord) pour chaque aplat ; couleur d'ENCRE = mediane des
pixels les plus eloignes du fond (coeur du trait), jamais un pixel de frange.
CONTROLE POSITIF : les aplats de la REFERENCE doivent retrouver les hex ECRITS dans la CSS
                   (#1e1b16, #3a352c, #efe7d6, #a8402f, #141a21, #2c3640, #241c11, #5a4a2a, #cbbfa4).
CONTROLE NEGATIF : une fenetre a cheval sur deux aplats doit rendre une valeur intermediaire (signalee)."""
from PIL import Image
def m(vals): vals=sorted(vals); return vals[len(vals)//2]
def fen(path,x0,y0,x1,y1):
    im=Image.open(path).convert("RGB"); px=im.load()
    R=[];G=[];B=[]
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            p=px[x,y];R.append(p[0]);G.append(p[1]);B.append(p[2])
    return (m(R),m(G),m(B))
def hx(c): return "#%02x%02x%02x"%c
def encre(path,x0,y0,x1,y1,fond,q=0.90):
    """coeur du trait : mediane des pixels du decile le plus eloigne du fond"""
    im=Image.open(path).convert("RGB"); px=im.load()
    ps=[]
    for y in range(y0,y1+1):
        for x in range(x0,x1+1):
            p=px[x,y]; d=sum(abs(p[i]-fond[i]) for i in range(3)); ps.append((d,p))
    ps.sort(key=lambda t:-t[0]); k=max(1,int(len(ps)*(1-q)))
    sel=[p for d,p in ps[:k]]
    return (m([p[0] for p in sel]),m([p[1] for p in sel]),m([p[2] for p in sel])),len(sel)
REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
print("OUVERT",REF,Image.open(REF).size,"|",CAP,Image.open(CAP).size)
print("\n--- APLATS ---")
A=[
 ("REF fond ecran (haut de panneau)",REF,300,612,700,636,"gradient #1c1a17->#111014"),
 ("REF fond ecran (milieu du vide)", REF,300,1400,700,1500,"gradient"),
 ("REF fond ecran (bas du vide)",    REF,300,1700,700,1770,"gradient"),
 ("CAP fond ecran (haut)",           CAP,300,180,700,270,""),
 ("CAP fond ecran (milieu)",         CAP,300,1550,700,1700,""),
 ("CAP fond ecran (bas, av. dock)",  CAP,300,2050,700,2130,""),
 ("REF bandeau entete .entete",      REF,300,445,700,470,"CSS #1e1b16"),
 ("REF filet .entete border-bottom", REF,300,605,700,605,"CSS #3a352c"),
 ("REF papier .bon",                 REF,300,700,700,740,"CSS #efe7d6"),
 ("CAP papier .bon",                 CAP,300,700,700,730,""),
 ("REF bloc .penurie",               REF,300,1090,700,1150,"CSS #a8402f"),
 ("REF filet pointille .l",          REF,300,750,700,750,"CSS dotted #c3b79e"),
 ("REF bande perforee .bon::after",  REF,300,1212,700,1222,"CSS #cbbfa4"),
 ("REF bande .bas",                  REF,300,1800,700,1820,"CSS #141a21"),
 ("REF filet .bas border-top",       REF,300,1782,700,1785,"CSS #2c3640"),
 ("REF fond CTA .geste",             REF,300,1950,700,1970,"CSS #241c11"),
 ("REF bord CTA .geste",             REF,300,1939,700,1939,"CSS #5a4a2a"),
 ("CAP fond CTA",                    CAP,300,1385,700,1410,""),
]
for nom,path,x0,y0,x1,y1,att in A:
    c=fen(path,x0,y0,x1,y1); print("  %-34s %-18s %s   %s"%(nom,str(c),hx(c),att))
print("\n--- ENCRES (coeur du trait) ---")
E=[
 ("REF titre h3",              REF, 51,480,945,512,(30,27,22),"CSS #f0dfc4"),
 ("CAP titre",                 CAP, 60,294,1001,343,(13,13,13),""),
 ("REF sous-titre .entete p",  REF, 51,543,907,564,(30,27,22),"CSS #9a8f78"),
 ("CAP sous-titre",            CAP, 60,483,975,515,(13,13,13),""),
 ("REF 'Pyralin' h4",          REF, 91,684,232,710,(239,231,214),"CSS #2a2118"),
 ("CAP 'Pyralin'",             CAP,105,655,308,693,(234,224,200),""),
 ("REF 'BON DE COMMANDE'",     REF,703,695,985,710,(239,231,214),"CSS #8a7f6b"),
 ("CAP 'BON DE COMMANDE'",     CAP,663,650,976,670,(234,224,200),""),
 ("REF libelle .l u",          REF, 90,908,400,929,(239,231,214),"CSS #7a6d58"),
 ("CAP libelle",               CAP,104,894,400,917,(234,224,200),""),
 ("REF valeur noire .l b",     REF,741,770,989,795,(239,231,214),"CSS #2a2118"),
 ("CAP valeur noire",          CAP,698,740,977,770,(234,224,200),""),
 ("REF valeur rouge .l b.rouge",REF,540,839,989,864,(239,231,214),"CSS #a8402f"),
 ("CAP valeur rouge",          CAP,560,815,978,845,(234,224,200),""),
 ("REF citation .dit",         REF,256,1825,979,1856,(20,26,33),"CSS #cdd6e0"),
 ("CAP citation",              CAP,234,1271,1019,1305,(13,13,13),""),
 ("REF 'Lt. Kane' .dit b",     REF, 50,1825,195,1856,(20,26,33),"CSS #eef3f9"),
 ("CAP 'Nestor'",              CAP, 56,1271,190,1305,(13,13,13),""),
 ("REF CTA libelle .geste",    REF, 95,1976,438,2000,(36,28,17),"CSS #d9ab4e"),
 ("CAP CTA libelle",           CAP,112,1428,493,1456,(217,171,77),""),
 ("REF CTA small",             REF,617,1980,986,2000,(36,28,17),"CSS #9a8a6a"),
 ("CAP titron 'LA CHAINE'",    CAP, 60,1099,513,1126,(13,13,13),"CSS .titron #8a8069"),
 ("CAP texte bouche-trou",     CAP, 60,1152,972,1181,(13,13,13),""),
]
for nom,path,x0,y0,x1,y1,fond,att in E:
    c,n=encre(path,x0,y0,x1,y1,fond); print("  %-30s %-18s %s  (n=%d)  %s"%(nom,str(c),hx(c),n,att))
print("\nCONTROLE NEGATIF (fenetre a cheval papier/fond, ref x300 y1225..1235) :",hx(fen(REF,300,1225,700,1235)),"-> valeur intermediaire attendue")
