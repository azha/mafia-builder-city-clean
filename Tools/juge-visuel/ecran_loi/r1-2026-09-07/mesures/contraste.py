# Contraste WCAG encre/fond. Encre = mediane des 60 pixels les plus eloignes du fond ;
# fond = mediane d une fenetre voisine SANS encre (>=4 px du glyphe le plus proche).
# Controle positif : le blanc pur sur le fond de carte (34,42,46) doit rendre ~15,4:1.
# Controle negatif : le fond contre lui-meme doit rendre 1,00:1.
from PIL import Image
import statistics as st
def rl(v):
    v/=255.0
    return v/12.92 if v<=0.03928 else ((v+0.055)/1.055)**2.4
def L(c): return 0.2126*rl(c[0])+0.7152*rl(c[1])+0.0722*rl(c[2])
def ratio(a,b):
    la,lb=L(a),L(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def encre(im,x0,y0,x1,y1,fond,n=60):
    px=im.load(); cand=[]
    for y in range(y0,y1):
        for x in range(x0,x1):
            c=px[x,y]; cand.append((sum((c[i]-fond[i])**2 for i in range(3)),c))
    cand.sort(reverse=True); top=[c for _,c in cand[:n]]
    return (int(st.median([c[0] for c in top])),int(st.median([c[1] for c in top])),int(st.median([c[2] for c in top])))
def hx(c): return '#%02x%02x%02x'%tuple(c)
print('CONTROLE POSITIF blanc sur carte : %.2f:1'%ratio((255,255,255),(34,42,46)))
print('CONTROLE NEGATIF fond/fond       : %.2f:1'%ratio((13,13,13),(13,13,13)))
print()
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture  ',cap.size)
print()
print('%-34s %-9s %-9s %s'%('partie','encre','fond','contraste'))
def ligne(nom,im,box,fond):
    e=encre(im,*box,fond); print('%-34s %-9s %-9s %.2f:1'%(nom,hx(e),hx(fond),ratio(e,fond)))
print('--- REFERENCE ---')
ligne('h3 titre',            ref,(50,470,830,520),(26,31,38))
ligne('p sous-titre',        ref,(50,535,845,570),(26,31,38))
ligne('titron',              ref,(50,900,700,930),(23,27,32))
ligne('pl-item span',        ref,(130,980,900,1015),(30,36,43))
ligne('pl-item em (lourd)',  ref,(940,985,1000,1010),(30,36,43))
ligne('pl-dit',              ref,(50,1780,1010,1815),(20,26,33))
ligne('pl-geste libelle',    ref,(90,1935,600,1995),(36,28,17))
print('--- CAPTURE ---')
ligne('titre Le parloir',    cap,(55,290,400,355),(13,13,13))
ligne('sous-titre',          cap,(55,400,945,440),(13,13,13))
ligne('titron VOS AVOCATS',  cap,(55,483,290,515),(13,13,13))
ligne('vide "Vous n avez"',  cap,(55,530,680,572),(13,13,13))
ligne('titron QUI PEUT',     cap,(55,610,505,650),(13,13,13))
ligne('carte b',             cap,(90,700,430,740),(34,42,46))
ligne('carte i',             cap,(90,765,700,810),(34,42,46))
ligne('tag EN PLACE',        cap,(840,700,990,730),(34,42,46))
ligne('tag DISPONIBLE',      cap,(800,880,990,910),(34,42,46))
ligne('tag A VOS RISQUES',   cap,(745,1055,990,1095),(34,42,46))
ligne('para filiere',        cap,(55,1210,1025,1285),(13,13,13))
ligne('titron AFFAIRES',     cap,(55,1325,395,1358),(13,13,13))
ligne('vide "Aucune"',       cap,(55,1372,455,1408),(13,13,13))
ligne('"Une affaire nait"',  cap,(55,1424,910,1455),(13,13,13))
