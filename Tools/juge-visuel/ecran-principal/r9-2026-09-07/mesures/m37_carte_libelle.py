# m37 — carte de pixels des libelles : on LIT la hauteur de capitale directement (aucune heuristique).
# '#' = encre (L >= fond + 60 % de l'ecart au maximum local), '.' = fond
import sys, os; sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from commun import *
print('=== m37 cartes de pixels des libelles ===')
def carte(px, x0,x1,y0,y1, titre):
    vals=[lum(px[x,y]) for y in range(y0,y1) for x in range(x0,x1)]
    f=med(vals); hi=sorted(vals)[int(len(vals)*0.995)]
    s=f+0.60*(hi-f)
    print('   %s  (fond L=%.4f, max L=%.4f, seuil %.4f)'%(titre,f,hi,s))
    for y in range(y0,y1):
        print('     %4d |'%y + ''.join('#' if lum(px[x,y])>=s else '.' for x in range(x0,x1)))
imd=ouvrir(DIST,'district2400'); pd=imd.load()
imf=ouvrir(F1920,'fiche1920'); pf=imf.load()
imc=ouvrir(CANON,'canon'); pc=imc.load()
carte(pd, 465, 520, 792, 810, 'jeu : libelle "Laboratoire" sous B01')
carte(pd, 250, 320, 2306, 2324, 'jeu : libelle du dock #2 (FAMILLE)')
carte(pc, 255, 330, 1985, 2005, 'canon : libelle du dock FAMILLE')
