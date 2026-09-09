import sys; sys.path.insert(0,'.')
from lib import *
print("=== m33 : etat des 4 tuiles (pastilles + filets) — le temoin est bien le cadre #120 ? ===")
# tuiles REF : y 1000..1098 / 1115..1213 / 1231..1328 / 1346..1444 ; x 542..997
# tuiles JEU : y 998..1087 / 1105..1194 / 1212..1301 / 1320..1409 ; x 539..999
CAS=[('REF','../reference-1080x2102.png',[(1000,1098),(1115,1213),(1231,1328),(1346,1444)],542,997),
     ('JEU','../capture-1080x2400.png',  [(998,1087),(1105,1194),(1212,1301),(1320,1409)],539,999)]
for nom,f,tt,xl,xr in CAS:
    im=ouvrir(f); p=px(im)
    print(f"  --- {nom} ---")
    for i,(a,b) in enumerate(tt):
        ym=(a+b)//2
        # pastille : disque plus clair pres du bord gauche
        bb=bbox_masque(im, lambda c: lum(c)>28 and lum(c)<200, xl+12, a+18, xl+70, b-18)
        past = mediane_fenetre(p, xl+30, ym-4, xl+40, ym+5)
        filet = mediane_fenetre(p, (xl+xr)//2-20, a, (xl+xr)//2+20, a+3)
        fond  = mediane_fenetre(p, xr-60, ym-8, xr-20, ym+8)
        d=(bb[2]-bb[0]+1, bb[3]-bb[1]+1) if bb else None
        print(f"     tuile {i+1} y{a}..{b} : pastille couleur={past} diam~{d} | filet haut={filet} | fond={fond}")
