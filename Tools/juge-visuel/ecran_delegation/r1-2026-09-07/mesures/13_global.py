#!/usr/bin/env python3
"""Couche GLOBALE : palette quantifiee (part d'aire), luminance moyenne, densite d'encre,
contrastes WCAG des textes principaux, et texture de la bande haute hors medaillon.
Zone comparee = la ZONE DE CONTENU seule (panneau), chrome exclu des deux cotes.
Controle positif : la part du 'fond sombre' doit dominer (>50 %) des deux cotes (ecran sombre).
Controle negatif : la palette d'une bande de TEXTE pur doit, elle, etre minoritaire en aire."""
from PIL import Image
D="/home/erutheone/project/mafia-unity-J/Tools/juge-visuel/ecran_delegation/r1-2026-09-07/"
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rl(c):
    def f(v):
        v/=255.0
        return v/12.92 if v<=0.04045 else ((v+0.055)/1.055)**2.4
    return 0.2126*f(c[0])+0.7152*f(c[1])+0.0722*f(c[2])
def contraste(a,b):
    la,lb=rl(a),rl(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
ref=Image.open(D+"reference-1080x2102.png").convert("RGB")
cap=Image.open(D+"capture-1080x2400.png").convert("RGB")
print("REF",ref.size,"CAP",cap.size)
# zone de contenu : REF panneau 434..2098 ; CAP panneau 143..2152
Z=(("REF",ref,(8,434,1072,2098)),("CAP",cap,(4,143,1076,2152)))
print("\n=== PALETTE (quantifiee a 32 niveaux/canal, top 6 par aire) ===")
for tag,im,(x0,y0,x1,y1) in Z:
    reg=im.crop((x0,y0,x1,y1)); px=reg.load(); W,H=reg.size
    h={}
    tot=0
    for y in range(0,H,2):
        for x in range(0,W,2):
            p=px[x,y]; k=(p[0]//16*16,p[1]//16*16,p[2]//16*16)
            h[k]=h.get(k,0)+1; tot+=1
    top=sorted(h.items(),key=lambda kv:-kv[1])[:6]
    print(f"  [{tag}] zone {x1-x0}x{y1-y0}, n={tot}")
    for k,v in top: print(f"     #%02x%02x%02x  %5.1f %%"%(k[0],k[1],k[2],100*v/tot))
print("\n=== LUMINANCE MOYENNE et DENSITE D'ENCRE (lum > fond+18) ===")
for tag,im,(x0,y0,x1,y1) in Z:
    reg=im.crop((x0,y0,x1,y1)); px=reg.load(); W,H=reg.size
    vs=[lum(px[x,y]) for y in range(0,H,2) for x in range(0,W,2)]
    m=sum(vs)/len(vs)
    vt=sorted(vs); fond=vt[len(vt)//2]
    enc=sum(1 for v in vs if v>fond+18)
    print(f"  [{tag}] luminance moyenne={m:6.2f}  fond median={fond:6.2f}  densite d'encre={100*enc/len(vs):5.2f} %")
print("\n=== TEXTURE de la bande haute HORS medaillon (x 20..400) ===")
def sigma(im,x0,y0,x1,y1):
    px=im.load(); vs=[lum(px[x,y]) for y in range(y0,y1,2) for x in range(x0,x1,2)]
    m=sum(vs)/len(vs); return m,(sum((v-m)**2 for v in vs)/len(vs))**0.5
for nom,im,b in (("REF y=230..430 (art district)",ref,(20,230,400,430)),
                 ("CAP y=150..270 (tete du panneau)",cap,(20,150,400,270)),
                 ("REF temoin plat (panneau vide)",ref,(200,1500,580,1700)),
                 ("CAP temoin plat (panneau vide)",cap,(200,1400,580,1600))):
    m,s=sigma(im,*b); print(f"   {nom:36s} moyenne={m:6.2f} sigma={s:5.2f}")
print("\n=== CONTRASTES WCAG (encre mesuree / fond mesure) ===")
C=[("h3 titre / fond tete",      (238,243,249),(27,32,39),(238,243,249),(28,33,40)),
   ("p sous-titre / fond tete",  (141,153,166),(27,32,39),(141,153,166),(28,33,40)),
   ("plaque q b / plaque",       (238,243,249),(33,41,49),(238,243,249),(34,38,46)),
   ("plaque q i / plaque",       (141,153,166),(33,41,49),(141,153,166),(34,38,46)),
   ("tenu.vous b / plaque",      (143,223,228),(33,41,49),(143,223,228),(34,38,46)),
   ("jeton b / jeton",           (217,171,78),(36,28,17),(217,171,77),(34,28,13)),
   ("jeton i / jeton",           (154,138,106),(36,28,17),(154,138,106),(34,28,13)),
   ("sv-dit / sv-bas",           (205,214,224),(20,26,33),(205,214,224),(22,28,34)),
   ("CTA libelle / CTA",         (217,171,78),(36,28,17),(139,106,106),(28,22,22)),
   ("CTA small / CTA",           (154,138,106),(36,28,17),(120,94,94),(28,22,22)),
  ]
print(f"{'texte':30s} {'REF':>8s} {'CAP':>8s}")
for nom,ea,fa,eb,fb in C:
    print(f"{nom:30s} {contraste(ea,fa):7.2f}:1 {contraste(eb,fb):7.2f}:1")
print(f"{'titron (CAP seul) / fond':30s} {'-':>10s} {contraste((126,139,152),(20,24,29)):7.2f}:1")
