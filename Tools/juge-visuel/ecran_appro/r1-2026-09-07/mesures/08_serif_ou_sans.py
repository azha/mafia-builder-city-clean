# -*- coding: utf-8 -*-
"""Discriminateur SERIF / SANS : densite d'encre au PIED des lettres rapportee a la densite au MILIEU.
Un serif pose des empattements horizontaux a la ligne de base -> le pied est plus large que le fut.
CONTROLES (tous sur la REFERENCE, dont la CSS DECLARE la police) :
  positifs SERIF : titre h3 ('DejaVu Serif'), 'Pyralin' h4 ('DejaVu Serif'), citation .dit ('DejaVu Serif')
  negatifs SANS  : sous-titre .entete p ('DejaVu Sans'), libelles .bon .l u ('DejaVu Sans'), CTA .geste ('DejaVu Sans')
L'instrument n'est recevable que si les deux groupes se separent SANS recouvrement."""
from PIL import Image

def encre_profil(path,xa,xb,ya,yb,fond,seuil=45):
    im=Image.open(path).convert("RGB"); px=im.load()
    prof=[]
    for y in range(ya,yb+1):
        c=0
        for x in range(xa,xb+1):
            p=px[x,y]
            if max(abs(p[i]-fond[i]) for i in range(3))>seuil: c+=1
        prof.append(c)
    return prof

def ratio_pied(path,xa,xb,ya,yb,fond):
    """ya..yb = bande de CAPITALE seule (haut de capitale -> ligne de base)."""
    prof=encre_profil(path,xa,xb,ya,yb,fond)
    n=len(prof)
    if n<10 or max(prof)==0: return None
    bas=prof[int(n*0.86):]                 # 14% du bas = les pieds
    mil=prof[int(n*0.35):int(n*0.65)]      # coeur du fut
    return (sum(bas)/len(bas))/(sum(mil)/len(mil))

REF="../reference-1080x2102.png"; CAP="../capture-1080x2400.png"
PAP_R=(239,231,214); PAP_C=(234,224,200); ENT=(30,27,22); NOIR=(13,13,13); BAS=(20,26,33); OR=(217,171,77)
im=Image.open(REF); print("OUVERT reference",im.size); im2=Image.open(CAP); print("OUVERT capture  ",im2.size)

CTRL=[
 ("REF titre h3        [DejaVu Serif decl.]","SERIF",REF, 51, 945, 480,512, ENT),
 ("REF 'Pyralin' h4    [DejaVu Serif decl.]","SERIF",REF, 91, 310, 684,710, PAP_R),
 ("REF citation .dit   [DejaVu Serif decl.]","SERIF",REF, 50, 979,1829,1851, BAS),
 ("REF sous-titre p    [DejaVu Sans decl.] ","SANS", REF, 51, 907, 543,561, ENT),
 ("REF libelles .l u   [DejaVu Sans decl.] ","SANS", REF, 90, 400, 908,929, PAP_R),
 ("REF CTA .geste      [DejaVu Sans decl.] ","SANS", REF, 90, 460,1976,2000, OR if False else (36,28,17)),
]
print("\n--- CONTROLES sur la REFERENCE (police DECLAREE par la CSS) ---")
vals={}
for nom,att,path,xa,xb,ya,yb,fond in CTRL:
    r=ratio_pied(path,xa,xb,ya,yb,fond); vals[nom]=(att,r)
    print("  %-42s attendu %-5s  ratio pied/fut = %.3f"%(nom,att,r))
s=[v[1] for v in vals.values() if v[0]=="SERIF"]; n=[v[1] for v in vals.values() if v[0]=="SANS"]
print("  SERIF : min=%.3f max=%.3f | SANS : min=%.3f max=%.3f | separation = %s"
      %(min(s),max(s),min(n),max(n),"OUI" if min(s)>max(n) else "NON -> instrument NON RECEVABLE"))
SEUIL=(min(s)+max(n))/2
print("  seuil de decision = %.3f"%SEUIL)

MES=[
 ("CAP titre 'Commander de la matiere'",CAP, 60,1001, 294,343, NOIR),
 ("CAP 'Pyralin' h4                   ",CAP,105, 320, 655,693, PAP_C),
 ("CAP citation 'Nestor : ...'        ",CAP, 56,1019,1275,1300, NOIR),
 ("CAP sous-titre                     ",CAP, 60, 975, 483,512, NOIR),
 ("CAP libelles 'LE PRIX'             ",CAP,104, 400, 894,917, PAP_C),
 ("CAP CTA 'EN COMMANDER'             ",CAP,110, 500,1428,1456, OR),
]
print("\n--- MESURES sur la CAPTURE ---")
for nom,path,xa,xb,ya,yb,fond in MES:
    r=ratio_pied(path,xa,xb,ya,yb,fond)
    print("  %-36s ratio = %.3f  -> %s"%(nom,r,"SERIF" if r>SEUIL else "SANS"))
