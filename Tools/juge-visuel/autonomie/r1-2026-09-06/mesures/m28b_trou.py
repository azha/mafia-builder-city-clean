# m28b — meme mesure, mais en admettant AUSSI la couleur de bouton (42,46,56) comme "intact",
# pour que le detecteur ne confonde pas un bouton avec le disque du manometre.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
OK=[(28,28,34),(42,46,56),(34,42,46),(22,22,28)]
def etranger(p): return all(max(abs(p[i]-c[i]) for i in range(3))>8 for c in OK)
def trou(y,label):
    xs=[x for x in range(320,760) if etranger(px[x,y])]
    if not xs: print('   y=%4d  %-24s  RIEN d etranger'%(y,label)); return
    seg=[];cur=xs[0];prev=xs[0]
    for x in xs[1:]:
        if x-prev>5: seg.append((cur,prev)); cur=x
        prev=x
    seg.append((cur,prev))
    big=max(seg,key=lambda s:s[1]-s[0])
    print('   y=%4d  %-24s  plus grand corps etranger x %d..%d (l=%d) ; tous=%s'%(y,label,big[0],big[1],big[1]-big[0]+1,seg[:6]))
for y,l in [(158,'ligne du titre COOK'),(170,'carte'),(185,'ligne cle A'),(200,'ligne valeur A'),
            (215,'bouton A haut'),(222,'bouton A'),(228,'bouton A, libelle'),(238,'bouton A bas'),
            (265,'ligne cle B   TEMOIN'),(302,'bouton B, libelle TEMOIN')]:
    trou(y,l)
