BASE='/home/erutheone/project/mafia-builder-city-clean/Tools/juge-visuel/04-accueil/'
REF=BASE+'r2-2026-10-07/reference/cadre-4-la-suite.png'
J19=BASE+'captures-2026-10-07-apres-r4b/p1_lancement_1080x1920.png'
J24=BASE+'captures-2026-10-07-apres-r4b/p1_lancement_1080x2400.png'
def lum(p): return 0.2126*p[0]+0.7152*p[1]+0.0722*p[2]
def charge(p):
    from PIL import Image
    im=Image.open(p).convert('RGB')
    print('OUVERT', p.split('/')[-1], im.size)
    return im
