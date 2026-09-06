# m25 — couche globale : palette quantifiee, luminance moyenne, densite d encre, contrastes.
from PIL import Image
import os
D=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ref=Image.open(os.path.join(D,'reference-1120.png')).convert('RGB')
cap=Image.open(os.path.join(D,'capture-1080x2400.png')).convert('RGB')
print('OUVERT ref',ref.size,'cap',cap.size)
R=ref.crop((0,0,1120,1850))
C=cap.crop((13,232,1066,2152))
print('zone REF',R.size,' zone CAP',C.size)
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def rel(p):
    def f(c):
        c/=255.0
        return c/12.92 if c<=0.04045 else ((c+0.055)/1.055)**2.4
    return 0.2126*f(p[0])+0.7152*f(p[1])+0.0722*f(p[2])
def contraste(a,b):
    la,lb=rel(a),rel(b)
    if la<lb: la,lb=lb,la
    return (la+0.05)/(lb+0.05)
def stats(im,label):
    px=im.load(); W,H=im.size
    n=0; s=0; enc=0
    hist={}
    for y in range(0,H,2):
        for x in range(0,W,2):
            p=px[x,y]; n+=1; s+=lum(p)
            if lum(p)>45: enc+=1
            q=(p[0]//16*16,p[1]//16*16,p[2]//16*16)
            hist[q]=hist.get(q,0)+1
    print('\n %s : %d px echantillonnes'%(label,n))
    print('   luminance moyenne = %.2f/255'%(s/n))
    print('   densite d encre (lum>45) = %.2f%%'%(100*enc/n))
    top=sorted(hist.items(),key=lambda kv:-kv[1])[:6]
    for q,c in top: print('     %s  %5.2f%%'%(str(q),100*c/n))
stats(R,'REFERENCE (feuille)')
stats(C,'CAPTURE (feuille)')
print('\n--- contrastes des textes principaux (sur leur fond mesure) ---')
cas=[('titre or-vif / fond tete',(242,201,107),(22,25,27),(242,201,106),(27,26,29)),
     ('sous-titre creme-2 / fond tete',(185,173,146),(22,25,27),(185,173,146),(27,26,29)),
     ('nom de rang creme / panneau',(234,224,200),(17,23,34),(234,224,200),(19,25,39)),
     ('libelle etat creme-2 / panneau',(185,173,146),(15,20,29),(185,173,146),(15,19,29)),
     ('texte puce cyan / panneau',(127,212,217),(18,25,36),(127,212,217),(17,22,34)),
     ('texte boite vide creme-2 / feuille',(185,173,146),(22,25,27),(185,173,146),(22,22,28))]
for nm,fr,br_,fc,bc in cas:
    print('   %-38s REF %5.2f:1   CAP %5.2f:1'%(nm,contraste(fr,br_),contraste(fc,bc)))
