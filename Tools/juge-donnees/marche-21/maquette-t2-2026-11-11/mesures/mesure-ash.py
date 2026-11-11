import re, os, sys, html
BASE=os.path.dirname(os.path.abspath(__file__))
TOT={'cases':0,'ash':0,'ash_on':0,'on_total':0}
for idx in (101,102,103,104,105,106,146):
    f=os.path.join(BASE,'cadre-%d.html'%idx)
    s=open(f,encoding='utf-8').read()
    rows=re.findall(r'<div class="rg">(.*?)</div>\s*(?=<div class="rg">|</div>)', s, re.S)
    # robust: split on <div class="rg"> markers
    parts=s.split('<div class="rg">')[1:]
    print(f'--- CADRE {idx} : {len(parts)} rangees .rg ---')
    if not parts:
        print('   (aucune grille .rg dans ce cadre)')
    for p in parts:
        qn=re.search(r'<span class="qn([^"]*)">(.*?)</span>', p)
        nom=html.unescape(qn.group(2)) if qn else '?'
        qncls=(qn.group(1) or '').strip() if qn else ''
        vys=re.findall(r'<div class="(vy[^"]*)"([^>]*)>', p)
        TOT['cases']+=len(vys)
        cols=['brindle','crick','hush','ash']
        desc=[]
        for i,(cls,attrs) in enumerate(vys):
            on='on' in cls.split()
            st=re.search(r'style="([^"]*)"', attrs)
            if on: TOT['on_total']+=1
            if i==3:
                TOT['ash']+=1
                if on: TOT['ash_on']+=1
            desc.append(f'{cols[i] if i<4 else "col%d"%i}=[class="{cls}"'+(f' style="{st.group(1)}"' if st else '')+']')
        print(f'   {nom!r} (qn class={qncls!r}) nb_vy={len(vys)} :: ' + ' | '.join(desc))
print()
print('TOTAL cases .vy        =', TOT['cases'])
print('TOTAL cases colonne 4 (index 3 = ash) =', TOT['ash'])
print('TOTAL cases ash AVEC .on =', TOT['ash_on'])
print('TOTAL cases .vy.on (toutes colonnes) =', TOT['on_total'])
sys.exit(1 if TOT['ash_on'] else 0)
