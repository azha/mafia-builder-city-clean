import re,sys,html
t=open('/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html',encoding='utf8').read()
# lignes de cadre (class panneau ... ) : trouver chaque .dit avec la classe d'écran la plus proche avant
seen={}
for m in re.finditer(r'<div class="dit">(.*?)</div>',t,re.S):
    pre=t[max(0,m.start()-6000):m.start()]
    cls=re.findall(r'<div class="(\w+6)" style="height:462px"',pre)
    ecr=cls[-1] if cls else '?'
    txt=re.sub(r'<[^>]+>','',m.group(1)); txt=html.unescape(txt)
    seen.setdefault((ecr,txt),0); seen[(ecr,txt)]+=1
for (e,x),n in sorted(seen.items()): print(e,n,x[:160])
