# m16 — palette dominante (histogramme quantifie) des zones de CONTENU, des deux cotes.
from PIL import Image
def pal(path,box,label,n=8):
    im=Image.open(path).convert('RGB'); print('OUVERT %s %s'%(path,im.size))
    c=im.crop(box); tot=c.width*c.height
    q=c.quantize(colors=n, method=Image.MEDIANCUT).convert('RGB')
    cnt=sorted(q.getcolors(tot), reverse=True)
    print('  %s  zone=%s aire=%d px'%(label,box,tot))
    for k,col in cnt:
        print('     %-16s %6.2f %%'%(str(col),100.0*k/tot))
    # luminance moyenne
    s=0
    for col,k in [(col,k) for k,col in cnt]: s+=k*sum(col)/3
    print('     luminance moyenne (0-255) = %.1f'%(s/tot))
pal('../reference-1080x2102.png',(0,229,1080,2102),'REFERENCE contenu (sous le bandeau)')
print()
pal('../capture-1080x2400.png',(0,143,1080,2179),'CAPTURE rect libre (bandeau->dock)')
print()
pal('../capture-1080x2400.png',(287,143,793,564),'CAPTURE le seul panneau de contenu')
