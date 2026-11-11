import re,sys,os
for f in sys.argv[1:]:
    s=open(f,encoding='utf-8').read()
    s=re.sub(r'>\s*<', '>\n<', s)
    out=f.replace('.html','.lisible.html')
    open(out,'w',encoding='utf-8').write(s)
    print(out, s.count('\n')+1)
