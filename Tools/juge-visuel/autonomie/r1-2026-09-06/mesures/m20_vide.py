# m20 — la zone "vide" de la capture est-elle VRAIMENT vide ? (un zero suspect se durcit)
# On mesure le nombre de TEINTES distinctes et l amplitude, sur y564..2178.
from PIL import Image
cap=Image.open('../capture-1080x2400.png').convert('RGB')
print('OUVERT capture',cap.size)
z=cap.crop((0,564,1080,2179))
cols=z.getcolors(maxcolors=1<<22)
cols.sort(reverse=True)
tot=z.width*z.height
print('  zone y564..2178 : aire=%d px, %d teintes distinctes'%(tot,len(cols)))
for k,c in cols[:8]: print('     %-14s %7.4f %%'%(str(c),100.0*k/tot))
mn=[min(c[i] for _,c in cols) for i in range(3)]
mx=[max(c[i] for _,c in cols) for i in range(3)]
print('     min=%s max=%s amplitude=%s'%(tuple(mn),tuple(mx),tuple(mx[i]-mn[i] for i in range(3))))
print()
print('  CONTROLE POSITIF du meme compteur sur une zone dont on SAIT qu elle porte du contenu :')
z2=cap.crop((287,143,793,564)); c2=z2.getcolors(maxcolors=1<<22)
print('     panneau x287..792 y143..563 : %d teintes distinctes'%len(c2))
z3=Image.open('../reference-1080x2102.png').convert('RGB').crop((53,790,1027,1470))
c3=z3.getcolors(maxcolors=1<<22)
print('     zone "vide" du LCD de la REFERENCE (y790..1469) : %d teintes distinctes'%len(c3))
