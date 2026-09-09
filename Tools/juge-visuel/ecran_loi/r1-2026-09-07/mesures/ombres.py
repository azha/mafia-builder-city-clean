# Ombre / halo autour des cartes ? On mesure d=1..14 px au dessus et au dessous du bord,
# et on ecrit la PORTEE (dernier d ou l ecart au fond depasse 0,5/255) avant de conclure "absent".
# Controle positif : a d=0 (sur le bord) l ecart doit etre grand (l aplat de la carte).
# Controle negatif : d=1..14 dans une zone sans carte (y 1500) doit rendre 0 partout.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); print('capture',cap.size)
ref=Image.open('../reference-1080x2102.png').convert('RGB'); print('reference',ref.size)
pc=cap.load(); pr=ref.load()
def profil(px,y0,sens,x0,x1,fond,n=15):
    out=[]
    for d in range(0,n):
        y=y0+sens*d
        vals=[max(abs(px[x,y][i]-fond[i]) for i in range(3)) for x in range(x0,x1)]
        out.append((d,round(sum(vals)/len(vals),2)))
    return out
print('CAPTURE carte1 : au dessus du bord haut (y=670), fond (13,13,13)')
print('  ',profil(pc,669,-1,200,900,(13,13,13)))
print('CAPTURE carte1 : sous le bord bas (y=829)')
print('  ',profil(pc,830,+1,200,900,(13,13,13)))
print('CONTROLE POSITIF a d=0 SUR la carte (y=700) :',profil(pc,700,+1,200,900,(13,13,13))[:2])
print('CONTROLE NEGATIF zone vide (y=1500) :',profil(pc,1500,+1,200,900,(13,13,13))[:6])
print()
print('REFERENCE item1 : au dessus du bord haut (y=961), fond local (23,27,32)')
print('  ',profil(pr,960,-1,200,900,(23,27,32)))
