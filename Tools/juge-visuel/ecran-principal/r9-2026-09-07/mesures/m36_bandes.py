# m36 — hauteur de bande d'encre (= hauteur de capitale pour un texte sans jambage) sur une fenetre GENEREUSE,
# la bande etant trouvee automatiquement (profil de lignes). Meme instrument pour tous les textes compares.
import sys, os, math; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m36 bandes d encre (hauteur de capitale) ===')
def bande(px, x0,x1,y0,y1, sc, nom):
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    fond=med(vals); hi=sorted(vals)[int(len(vals)*0.99)]
    if hi-fond < 0.02: print('   %-34s : pas d encre nette (fond %.4f hi %.4f)'%(nom,fond,hi)); return
    seuil=(fond+hi)/2.0
    rows=[(y,sum(1 for x in range(x0,x1) if lum(px[x,y])>=seuil)) for y in range(y0,y1)]
    mx=max(n for _,n in rows)
    act=[y for y,n in rows if n>=max(2,0.15*mx)]
    if not act: print('   %-34s : rien'%nom); return
    # plus longue bande contigue
    seg=[]; cur=[act[0]]
    for y in act[1:]:
        if y-cur[-1]<=1: cur.append(y)
        else: seg.append(cur); cur=[y]
    seg.append(cur); s=max(seg,key=len)
    cols=[x for x in range(x0,x1) if any(lum(px[x,y])>=seuil for y in s)]
    print('   %-34s : bande y %4d..%4d = %4.1f px = %5.2f CSS ; encre sur x %4d..%4d (%6.2f CSS) ; %d lignes actives'
          % (nom, s[0], s[-1], s[-1]-s[0]+1, (s[-1]-s[0]+1)/sc, min(cols), max(cols), (max(cols)-min(cols)+1)/sc, len(act)))

imd=ouvrir(DIST,'district2400'); pd=imd.load()
imf=ouvrir(F1920,'fiche1920'); pf=imf.load()
imc=ouvrir(CANON,'canon'); pc=imc.load()
print('  -- libelles de type du district (jeu, 1080x2400) --')
for nom,mx,my in [('B01 Laboratoire',490,783),('B02 Cache',803,855),('B04 Planque',905,911),
                  ('B07 Commerce-ecran',136,1027),('B10 Commerce-ecran',723,1480),('B11 Commerce-ecran',148,1496)]:
    bande(pd, mx-80, mx+81, my+8, my+26, SC_CAPT, nom)
print('  -- reperes d echelle --')
bande(pd, 250, 420, 2285, 2325, SC_CAPT, 'jeu : libelle du dock #2')
bande(pd,   0, 130,  228,  268, SC_CAPT, 'jeu : nom de district')
bande(pf, 520, 740, 1258, 1300, SC_CAPT, 'jeu : sous-titre de la fiche')
bande(pc, 250, 430, 1955, 2000, SC_CANON, 'canon : libelle du dock FAMILLE')
bande(pc,  40, 200,  120, 180, SC_CANON, 'canon : lib ARGENT')
