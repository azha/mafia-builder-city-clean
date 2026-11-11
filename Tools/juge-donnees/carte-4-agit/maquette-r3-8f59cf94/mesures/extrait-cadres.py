import re, sys
from html.parser import HTMLParser

src = open('/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/12bb723c-e30b-4127-8b2d-58b0fa9e44d9/scratchpad/jd/m/accueil.html', encoding='utf-8').read()

# split on top-level <div class="cadre">
idx = [m.start() for m in re.finditer(r'<div class="cadre">', src)]
print("CADRES trouvés:", len(idx))

VOID = {'br','img','hr','input','meta','link','source','path','svg','use','circle','rect','line','polygon','polyline','g','defs','stop','linearGradient','radialGradient','ellipse'}

class P(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.out=[]; self.stack=[]
    def handle_starttag(self, tag, attrs):
        d=dict(attrs)
        if tag=='svg': self.svg=True
        self.stack.append((tag, d.get('class',''), d.get('style','')))
    def handle_endtag(self, tag):
        for i in range(len(self.stack)-1,-1,-1):
            if self.stack[i][0]==tag:
                del self.stack[i:]; break
    def handle_data(self, data):
        t=data.strip()
        if not t: return
        if any(s[0] in ('svg','style','script','path') for s in self.stack): return
        path='/'.join(f"{tg}.{cl}" if cl else tg for tg,cl,_ in self.stack[-3:])
        self.out.append((path, t))

for n in range(len(idx)):
    a=idx[n]; b=idx[n+1] if n+1<len(idx) else len(src)
    seg=src[a:b]
    p=P(); p.feed(seg)
    print(f"\n########## CADRE index {n} (offset {a}) ##########")
    for path,t in p.out:
        print(f"  [{path}] {t!r}")
