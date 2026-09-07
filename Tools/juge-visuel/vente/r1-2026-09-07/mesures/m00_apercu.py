# m00 — apercu : ouvre les 3 images, imprime leur taille, produit des vignettes de lecture
from PIL import Image
import os
D = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
files = ['reference-1080x2102.png','capture-1080x2400.png','capture-planche-1080x2400.png']
for f in files:
    im = Image.open(os.path.join(D,f)).convert('RGB')
    print(f'OUVERT {f} taille={im.size} mode={im.mode}')
    # vignette pleine hauteur
    w,h = im.size
    sc = 700.0/w
    im.resize((int(w*sc), int(h*sc)), Image.LANCZOS).save(os.path.join(D,'mesures','vign_'+f))
    print(f'   vignette -> mesures/vign_{f} taille={(int(w*sc), int(h*sc))}')
# CONTROLE POSITIF : la reference fait bien 1080 de large comme le dossier l'annonce
ref = Image.open(os.path.join(D,files[0]))
print('CONTROLE POSITIF largeur reference == 1080 :', ref.size[0]==1080)
cap = Image.open(os.path.join(D,files[1]))
print('CONTROLE POSITIF largeur capture   == 1080 :', cap.size[0]==1080)
print('CONTROLE NEGATIF hauteurs differentes (2102 vs 2400) :', ref.size[1]!=cap.size[1], ref.size[1], cap.size[1])
