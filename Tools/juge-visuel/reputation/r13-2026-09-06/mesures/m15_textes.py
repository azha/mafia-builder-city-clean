# m15 — LES TEXTES : hauteur de capitale, largeur d'encre, couleur, contraste WCAG sur le fond local.
# Convention de bord : ENCRE := px a moins de 60 (Chebyshev) de la couleur nominale du texte, mesuree
#   comme la couleur la PLUS FREQUENTE de la boite hors fond. Hauteur de capitale = hauteur du plus
#   haut bloc de rangees d'encre contigu (les descendantes sont donc hors mesure quand la ligne n'en a
#   pas ; les boites sont choisies sur des lignes de CAPITALES la ou c'est possible).
# Fond local := mediane des px de la boite qui ne sont pas de l'encre et sont a >= 6 px de toute encre.
# Controle positif : la couleur d'encre trouvee doit etre EGALE REF/JEU pour les textes partages.
# Controle negatif : une boite VIDE (fond seul) doit rendre 0 rangee d'encre.
import sys, os
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lib import *
from collections import Counter

def mesure(im, nom, box, nominal=None, seuil=60):
    p=px(im); x0,y0,x1,y1=box
    if nominal is None:
        cn=Counter(im.crop(box).getdata())
        fond=cn.most_common(1)[0][0]
        cand=[c for c,k in cn.most_common(40) if dist(c,fond)>40]
        nominal=cand[0] if cand else fond
    rows={}
    for y in range(y0,y1):
        xs=[x for x in range(x0,x1) if dist(p[x,y],nominal)<=seuil]
        if xs: rows[y]=(min(xs),max(xs),len(xs))
    if not rows:
        print(f"   {nom:44s} : AUCUNE ENCRE"); return None
    ys=sorted(rows); seg=[]
    for y in ys:
        if seg and y==seg[-1][-1]+1: seg[-1].append(y)
        else: seg.append([y])
    s=max(seg,key=len)
    xs0=min(rows[y][0] for y in ys); xs1=max(rows[y][1] for y in ys)
    encre=set()
    for y in ys:
        for x in range(x0,x1):
            if dist(p[x,y],nominal)<=seuil: encre.add((x,y))
    loin=[p[x,y] for y in range(y0,y1) for x in range(x0,x1)
          if all((x+dx,y+dy) not in encre for dx in range(-6,7) for dy in range(-6,7))]
    if loin:
        fl=tuple(sorted(c[i] for c in loin)[len(loin)//2] for i in range(3))
    else: fl=(0,0,0)
    print(f"   {nom:44s} : capitale {s[-1]-s[0]+1:>3} px · encre x {xs0}..{xs1} = {xs1-xs0+1:>4} px"
          f" · {len(encre):>5} px · couleur {str(nominal):18s} · fond {str(fl):16s}"
          f" · contraste {contraste(nominal,fl):5.2f}:1")
    return (s[-1]-s[0]+1, xs1-xs0+1, len(encre), nominal, fl, contraste(nominal,fl))

ref=ouvrir('reference-1080x2102.png'); cap=ouvrir('capture-1080x2400.png')
# boites derivees de m12 (offsets par rapport au filet haut du cadre : REF 452, JEU 482)
T=[('titre « Le miroir »',            (300,540,790,600),   (300,540,790,600)),
   ('sous-titre (capitales creme)',   (100,600,990,640),   (100,600,990,640)),
   ('chiffres du compteur 1 (cyan)',  (150,715,260,770),   (150,740,260,795)),
   ('libelle du compteur 1',          ( 60,775,360,805),   ( 55,800,356,832)),
   ('libelle de la carte portrait',   ( 95,915,495,960),   ( 90,940,495,985)),
   ('« Pas encore jugeable »',        (530,880,760,960),   (530,905,760,985)),
   ('aparte « ce qu\'il a absorbe… »', (780,880,990,970),  (780,905,990,995)),
   ('titre de la tuile 1',            (610,1010,960,1050), (610,975,960,1015)),
   ('sous-texte de la tuile 1',       (610,1050,960,1085), (610,1015,960,1050)),
   ('« Il vous ecoute » (vert)',      (140,1420,450,1470), (136,1445,450,1495)),
   ('sur-titre du panneau bas',       ( 80,1670,700,1710), ( 80,1712,700,1752)),
   ('titre du panneau bas (serif)',   ( 80,1720,760,1790), ( 80,1762,760,1832)),
   ('libelle du CTA',                 (200,1975,880,2025), (200,2012,880,2062))]
print("\n=== REFERENCE ===")
R={}
for nom,br,bc in T: R[nom]=mesure(ref,nom,br)
print("\n=== CAPTURE 2400 ===")
C={}
for nom,br,bc in T: C[nom]=mesure(cap,nom,bc)
print("\n=== ECARTS ===")
print(f"   {'texte':44s} {'capitale':>18s} {'largeur d\'encre':>22s} {'couleur':>10s} {'contraste':>18s}")
for nom,_,_ in T:
    a,b=R.get(nom),C.get(nom)
    if not a or not b: continue
    print(f"   {nom:44s} {a[0]:>7} -> {b[0]:<6} ({b[0]-a[0]:+d})  {a[1]:>7} -> {b[1]:<6}"
          f" ({100*(b[1]-a[1])/a[1]:+5.1f} %)  {dist(a[3],b[3]):>3}/255  {a[5]:6.2f} -> {b[5]:5.2f}")
print("\n  [controle negatif] boite vide (fond du cadre REF x900..1000 y1620..1640) :")
mesure(ref,'boite vide',(900,1620,1000,1640),nominal=(255,0,255))
