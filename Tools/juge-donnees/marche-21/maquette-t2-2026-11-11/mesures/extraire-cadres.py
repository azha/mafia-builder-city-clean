import re, sys, os, html
BASE=os.path.dirname(os.path.abspath(__file__))
s=open(os.path.join(BASE,'maquette-e364496.html'),encoding='utf-8')
s=s.read()
starts=[m.start() for m in re.finditer(r'<div class="cadre">', s)]
TAG=re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)([^>]*)>')
VOID={'br','img','input','hr','meta','link','source','use','path','circle','rect','line','polygon','polyline','ellipse','g','stop','defs','svg'}
def extraire(st):
    depth=0; i=st
    for m in TAG.finditer(s, st):
        closing=m.group(1)=='/' ; name=m.group(2).lower(); selfclose=m.group(3).rstrip().endswith('/')
        if name!='div': continue
        if closing: depth-=1
        elif not selfclose: depth+=1
        if depth==0: return s[st:m.end()]
    raise SystemExit('unbalanced at %d'%st)
for idx in [int(x) for x in sys.argv[1:]]:
    frag=extraire(starts[idx])
    out=os.path.join(BASE,'cadre-%d.html'%idx)
    open(out,'w',encoding='utf-8').write(frag)
    lab=re.search(r'<div class="etiquette">(.*?)</div>', frag, re.S)
    print(idx, len(frag), '|', html.unescape(re.sub(r'<[^>]+>','',lab.group(1))).strip() if lab else '?')
