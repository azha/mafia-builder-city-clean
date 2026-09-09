# m19 — etendue horizontale du disque du manometre a la hauteur du TITRE (y=50) et du sous-titre (y=90).
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
for y in (50,90,228):
    # le disque = zone claire/bleutee ou l anneau cuivre ; on releve les x ou l image
    # s ecarte nettement du fond de bandeau (14,18,28)
    F=px[900,y]
    xs=[x for x in range(300,800) if max(abs(px[x,y][i]-F[i]) for i in range(3))>18]
    if xs:
        # plus grand segment continu
        seg=[];cur=xs[0];prev=xs[0]
        for x in xs[1:]:
            if x-prev>6: seg.append((cur,prev)); cur=x
            prev=x
        seg.append((cur,prev))
        big=max(seg,key=lambda s:s[1]-s[0])
        print('  y=%3d fond(x900)=%s  plus grand segment non-fond : x %d..%d (largeur %d) ; tous=%s'%(y,str(F),big[0],big[1],big[1]-big[0]+1,seg))
print()
print('CONSTAT : encre du titre x305..623 (m18) ; aucune encre x624..900 dans la bande y38..68.')
