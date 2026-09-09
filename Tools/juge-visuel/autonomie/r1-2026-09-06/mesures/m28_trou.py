# m28 — le disque du manometre PERCE la carte : etendue du "trou" par ligne.
# Le fond de carte vaut (28,28,34) ; le disque/halo vaut autre chose.
# CONTROLE : les memes lignes du bloc B, ou l on SAIT que la carte est intacte.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB'); px=cap.load()
print('OUVERT capture',cap.size)
CARTE=(28,28,34)
def trou(y,label):
    xs=[x for x in range(440,660) if max(abs(px[x,y][i]-CARTE[i]) for i in range(3))>8]
    if not xs: print('   y=%4d  %-22s  AUCUN trou  (carte intacte)'%(y,label)); return
    print('   y=%4d  %-22s  trou x %d..%d  largeur=%d px'%(y,label,min(xs),max(xs),max(xs)-min(xs)+1))
for y,l in [(158,'carte, ligne du titre'),(170,'carte'),(185,'cle A'),(200,'valeur A'),(215,'bouton A'),
            (228,'bouton A, libelle'),(240,'bouton A'),(250,'carte'),(265,'cle B  TEMOIN'),
            (278,'valeur B TEMOIN'),(302,'bouton B, libelle TEMOIN'),(325,'carte TEMOIN')]:
    trou(y,l)
print()
print(' -> le disque opaque du manometre est dessine PAR-DESSUS la carte de rapport.')
