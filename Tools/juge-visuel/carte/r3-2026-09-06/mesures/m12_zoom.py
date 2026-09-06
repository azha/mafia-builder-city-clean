# m12 - zooms x4 sur les traits d'union et sur une tour, ref recalee (haut) / capture (bas)
import sys; sys.path.insert(0,'.')
from geom import *
from PIL import Image
w=Image.open('ref_warp.png').convert('RGB'); c=Image.open('../capture-hors-chrome-1080x2400.png').convert('RGB')
print('ref_warp',w.size,'cap',c.size)
def duo(box,name,z=4):
    a=w.crop(box); b=c.crop(box); W,H=a.size
    o=Image.new('RGB',(W,H*2+2),(255,0,0)); o.paste(a,(0,0)); o.paste(b,(0,H+2))
    o=o.resize((W*z,(H*2+2)*z),Image.NEAREST); o.save('vues/%s.png'%name); print(name,o.size,'box',box)
duo((830,1930,1010,2000),'zoom_PONTGRIS')
duo((850,930,1020,985),'zoom_DEPOTEST')
duo((80,935,300,985),'zoom_SAINTBRAND')
duo((440,1420,670,1455),'zoom_MARNEBASSE')
# une tour isolee (rectangle blanc) - reperee visuellement vers x=690..760 y=1400..1470
duo((660,1380,790,1480),'zoom_TOUR')
duo((410,1120,680,1180),'zoom_THRENNY')
