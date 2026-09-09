# m9 — le contenu respecte-t-il la gouttiere (rect libre entre bandeau et dock) ?
# Methode: le bandeau est un aplat. Dans les colonnes x287..399 et x681..792 (hors ARGENT,
# hors JOUR, hors manometre) le bandeau seul doit etre UNIFORME. Toute structure y est du contenu.
# CONTROLE POSITIF: les memes colonnes de la REFERENCE, dont on sait que le contenu commence
# SOUS le bandeau (le cadre serie 6 pose sa barre puis son chassis).
from PIL import Image
def analyse(path,label,y0,y1,bandes):
    im=Image.open(path).convert('RGB'); px=im.load()
    print('OUVERT %s %s'%(path,im.size))
    for (xa,xb) in bandes:
        vals=[]
        for y in range(y0,y1):
            p=list(im.crop((xa,y,xb,y+1)).getdata()); n=len(p)
            vals.append((y,tuple(sorted(q[c] for q in p)[n//2] for c in range(3))))
        # ecart-type approx: amplitude par canal
        mn=[min(v[1][c] for v in vals) for c in range(3)]
        mx=[max(v[1][c] for v in vals) for c in range(3)]
        print('  %s x%d..%d  y%d..%d : min=%s max=%s amplitude=%s'%(label,xa,xb,y0,y1,tuple(mn),tuple(mx),tuple(mx[c]-mn[c] for c in range(3))))
        # transitions
        prev=None; tr=[]
        for y,c in vals:
            if prev is not None and max(abs(c[i]-prev[i]) for i in range(3))>4: tr.append((y,c))
            prev=c
        print('     transitions (>4/255): %s'%(tr[:14] if tr else 'AUCUNE'))
print('=== CAPTURE : colonnes du contenu, DANS le bandeau (y 8..136) ===')
analyse('../capture-1080x2400.png','capture',8,137,[(300,395),(690,780)])
print()
print('=== CONTROLE POSITIF — REFERENCE : memes colonnes, DANS son bandeau (y 8..215) ===')
analyse('../reference-1080x2102.png','reference',8,216,[(300,395),(690,780)])
