# F2 : texte de la bande basse (voix) de chaque cadre de la maquette serie 6, par classe d'ecran
import re,html
t=open('/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html',encoding='utf8').read()
frames=[m.start() for m in re.finditer(r'<div class="panneau"><div class="(\w+6)" style="height:462px"',t)]
frames.append(len(t))
for i,s in enumerate(frames[:-1]):
    seg=t[s:frames[i+1]]
    cls=re.match(r'<div class="panneau"><div class="(\w+6)"',seg).group(1)
    if cls not in('carn6','demo6','tabl6','cfl6','lieg6','appr6','vitr6','dos6','rep6','parl6','serv6'): continue
    # bande basse : dernier bloc dont la classe contient bas/dit/voix
    out=[]
    for m in re.finditer(r'<div class="(dit|cn-dit|[\w-]*dit[\w-]*|voix|[\w-]*voix[\w-]*)"[^>]*>(.*?)</div>',seg,re.S):
        out.append(html.unescape(re.sub(r'<[^>]+>','',m.group(2))).strip()[:140])
    print(i,cls,out)
