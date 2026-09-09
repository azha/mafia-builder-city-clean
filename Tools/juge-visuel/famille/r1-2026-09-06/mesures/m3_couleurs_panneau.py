from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
def med(im,x0,y0,w,h):
    px=im.load(); vals=[[],[],[]]
    for y in range(y0,y0+h):
        for x in range(x0,x0+w):
            p=px[x,y]
            for i in range(3): vals[i].append(p[i])
    return tuple(sorted(v)[len(v)//2] for v in vals)
print('\nREFERENCE')
print('  fond feuille        ', med(ref,4,1780,40,40))
print('  don-rang haut-g     ', med(ref,700,300,40,20))
print('  don-rang bas-d      ', med(ref,900,430,40,20))
print('  rang1(actif) haut   ', med(ref,700,540,40,20))
print('  rang1(actif) bas    ', med(ref,700,670,40,20))
print('  rang2 haut          ', med(ref,700,940,40,20))
print('  rang2 bas           ', med(ref,700,1070,40,20))
print('\nCAPTURE')
print('  fond feuille        ', med(cap,20,1950,40,40))
print('  don-rang haut-g     ', med(cap,700,470,40,20))
print('  don-rang bas-d      ', med(cap,900,640,40,20))
print('  rang1 haut          ', med(cap,700,750,40,20))
print('  rang1 bas           ', med(cap,700,880,40,20))
print('  rang2 haut          ', med(cap,700,1130,40,20))
print('  rang2 bas           ', med(cap,700,1260,40,20))
