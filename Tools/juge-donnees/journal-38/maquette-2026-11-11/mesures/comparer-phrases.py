import re, json
D="/home/erutheone/project/mafia-builder-city-clean/Tools/juge-donnees/journal-38/maquette-2026-11-11/mesures/"
ST="/tmp/claude-1000/-home-erutheone-project-mafia-builder-city-clean/df180ef7-bd03-45c8-bca4-a4c3c6f0b99f/scratchpad/string_table.ts"
st=open(ST,encoding="utf-8").read().splitlines()
# FR block values (lines 6057-6060, 1-based)
fr={}
for ln in (6057,6058,6059,6060):
    line=st[ln-1]
    k=re.search(r"'(ambient\.apres_assister\.\w+)'",line).group(1)
    v=re.search(r":\s*'(.*)',\s*$",line).group(1)
    v=v.replace("\\u202f","\u202f")
    fr[k.split(".")[-1]]=v
frames={"full":"cadre-155-full","reduced":"cadre-156-reduced","minimal":"cadre-157-minimal","none":"cadre-158-none"}
rc=0
for band,fn in frames.items():
    s=open(D+fn+".html",encoding="utf-8").read()
    m=re.search(r'<div class="note6">(.*?)</div>',s,re.S)
    maq=re.sub(r'<[^>]+>','',m.group(1))
    ok = (maq==fr[band])
    print("band=%s  EGAL=%s"%(band,ok))
    print("  maquette  : %r"%maq)
    print("  string_tab: %r"%fr[band])
    if not ok:
        rc=1
        for i,(a,b) in enumerate(zip(maq,fr[band])):
            if a!=b:
                print("  1er ecart idx=%d maquette=U+%04X (%s) vs servi=U+%04X (%s)"%(i,ord(a),repr(a),ord(b),repr(b)))
                break
        if len(maq)!=len(fr[band]):
            print("  longueurs: maquette=%d servi=%d"%(len(maq),len(fr[band])))
print("RC=%d"%rc)
raise SystemExit(rc)
