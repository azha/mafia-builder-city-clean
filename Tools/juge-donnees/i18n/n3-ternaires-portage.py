#!/usr/bin/env python3
"""Portage Python de `LitterauxNommesPlayModeTests.SitesDeuxBranches` (garde N3 : ternaires à deux littéraux dont une branche est
un mot, dette EXACTE par fichier dans `DetteDeuxBranches`). Pour mesurer SANS la porte avant chaque commit qui touche un littéral.

Usage : python3 Tools/juge-donnees/i18n/n3-ternaires-portage.py [<rev>|arbre ...]   (défaut : l'arbre)
Rend les écarts (mesuré, dette) par fichier ; {} = la garde serait verte.
Validé le 2026-09-26 : 0 écart à 201a2563 (la table était verte), puis a vu la baisse 6 → 5 de ㉟ (1d0937fc) que j'avais ratée.
⚠️ Portage, pas la garde : c'est le test Unity qui fait foi ; un écart entre les deux se corrige dans le portage.
"""
import re,sys,subprocess,os
def sans_commentaires(t):
    o=[];ch=[];i=0;n=len(t)
    while i<n:
        c=t[i]
        if t.startswith('//',i):
            j=t.find('\n',i); j=n if j<0 else j; o.append(' '*(j-i)); i=j; continue
        if t.startswith('/*',i):
            j=t.find('*/',i+2); j=n if j<0 else j+2; o.append(re.sub(r'[^\n]',' ',t[i:j])); i=j; continue
        if c=="'":
            m=re.compile(r"'(\\.|[^'\\])'").match(t,i)
            if m: o.append(m.group(0)); i=m.end(); continue
        if c=='"' or (c in '@$' and i+1<n and t[i+1] in '"@$'):
            j=i; verb=False
            while t[j] in '@$': verb = verb or t[j]=='@'; j+=1
            deb=len(''.join(o)); k=j+1
            while k<n:
                if verb:
                    if t[k]=='"':
                        if k+1<n and t[k+1]=='"': k+=2; continue
                        break
                else:
                    if t[k]=='\\': k+=2; continue
                    if t[k]=='"' or t[k]=='\n': break
                k+=1
            k=min(k+1,n); o.append(t[i:k]); ch.append((deb,deb+(k-i))); i=k; continue
        o.append(c); i+=1
    return ''.join(o),ch
DB=re.compile(r'(?<![?"])\?\s*\$?"((?:[^"\\]|\\.)*)"\s*:\s*\$?"((?:[^"\\]|\\.)*)"')
N2=re.compile(r'==\s*"[A-Za-z_]+"\s*$')
L=re.compile(r'[^\W\d_]',re.U); G=re.compile(r'^\[[^\]]*\]$'); I=re.compile(r'^[A-Za-z0-9]+(_[A-Za-z0-9]+)+$'); H=re.compile(r'^#[0-9A-Fa-f]{3,8}$'); B=re.compile(r'^</?\w+>$')
def mot(l): return bool(L.search(l)) and not G.match(l) and not I.match(l) and not H.match(l) and not B.match(l) and l not in('true','false')
def sites(txt):
    t,ch=sans_commentaires(txt); r=[]
    for m in DB.finditer(t):
        p=m.start()
        if any(a<=p<b for a,b in ch): continue
        if N2.search(t[max(0,p-80):p]): continue
        if not mot(m.group(1)) and not mot(m.group(2)): continue
        r.append(t.count('\n',0,p)+1)
    return r
def mesurer(rev=None):
    res={}
    if rev:
        fs=subprocess.run(['git','ls-tree','-r','--name-only',rev,'Assets/Scripts'],capture_output=True,text=True).stdout.split()
        for f in fs:
            if f.endswith('.cs'):
                s=sites(subprocess.run(['git','show',f'{rev}:{f}'],capture_output=True,text=True).stdout)
                if s: res[os.path.basename(f)]=len(s)
    else:
        for d,_,fs in os.walk('Assets/Scripts'):
            for f in fs:
                if f.endswith('.cs'):
                    s=sites(open(os.path.join(d,f),encoding='utf-8').read())
                    if s: res[f]=len(s)
    return res
src=open('Assets/Tests/PlayMode/LitterauxNommesPlayModeTests.cs',encoding='utf-8').read()
blk=src[src.index('DetteDeuxBranches = new'):]; blk=blk[:blk.index('};')]
dette={k:int(v) for k,v in re.findall(r'\{\s*"([^"]+)",\s*(\d+)\s*\}',blk)}
for rev in (sys.argv[1:] or [None]):
    m=mesurer(rev if rev!='arbre' else None)
    ecarts={k:(m.get(k,0),dette.get(k,0)) for k in set(m)|set(dette) if m.get(k,0)!=dette.get(k,0)}
    print(rev,'écarts (mesuré, dette) :',ecarts)
