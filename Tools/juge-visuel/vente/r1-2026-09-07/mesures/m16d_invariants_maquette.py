# m16d — INVARIANTS DE STRUCTURE des 6 cadres du groupe LA VENTE, lus dans la SOURCE de la maquette.
# But : prouver que .cerne / .enseigne / .compteurs / 3 .fen sont dans TOUS les etats,
#       donc que leur absence en jeu ne s'explique par aucun choix de temoin.
# ATTENTION : deux versions anterieures de ce script rendaient 0 UNIFORME sur les 6 cadres.
#   Le motif etait juste, la POPULATION etait fausse : un cadre s'etale sur 3 LIGNES source et
#   je n'en lisais qu'une. Un resultat uniforme mesure autre chose que ce qu'on croit.
import re
SRC='/home/erutheone/project/atelier3d-mafia/ecrans-brennar-6.html'
lines=open(SRC,encoding='utf-8').read().split('\n')
deb=5771                      # ligne 5772 (1-based) = 1re ligne du cadre #107
fin=deb
while '<!-- ═══ fin LA VENTE' not in lines[fin]: fin+=1
txt='\n'.join(lines[deb:fin])
print('SOURCE %s : region lignes %d..%d (%d lignes)'%(SRC,deb+1,fin,fin-deb))
parts=txt.split('<div class="cadre">')[1:]
print('cadres du groupe :', len(parts))
C='class="cerne"'; E='class="enseigne"'; CO='class="compteurs"'; F='class="fen"'
L='class="liste"'; P='class="pied"'; CTA='cta6'; PA='class="pann"'; RIEN='class="rien"'
hdr='%-5s %-44s %5s %8s %8s %4s %5s %3s %5s %5s %5s %5s'
print(hdr%('cadre','etiquette','cerne','enseigne','compteur','fen','liste','dl','pied','cta6','pann','rien'))
for i,c in enumerate(parts):
    n=re.search(r'class="etiquette">([^<]*)<',c).group(1)
    dl=len(re.findall(r'class="dl[ "]',c))
    print(hdr%(('#%d'%(107+i), n[:44], c.count(C),c.count(E),c.count(CO),c.count(F),c.count(L),dl,c.count(P),c.count(CTA),c.count(PA),c.count(RIEN))))
print()
print('CONTROLE POSITIF cerne=1 & enseigne=1 & compteurs=1 & fen=3 dans les 6 :',
      all(c.count(C)==1 and c.count(E)==1 and c.count(CO)==1 and c.count(F)==3 for c in parts))
print('CONTROLE NEGATIF le tableau VARIE (sinon l instrument ne discrimine pas) :',
      len(set(len(re.findall(r'class="dl[ \"]',c)) for c in parts))>1)
print()
print('titre et sous-titre de chaque cadre :')
for i,c in enumerate(parts):
    m=re.search(r'<b>(La vente)</b><i>([^<]*)</i>',c)
    print('  #%d : titre=%r  sous-titre=%r'%(107+i, m.group(1) if m else None, m.group(2) if m else None))
print()
print('polices demandees par le bloc .vnt6 (l.5686-5768) :')
bloc='\n'.join(lines[5685:5768])
import collections
print('  ', collections.Counter(re.findall(r"'[A-Za-z ]+'", bloc)))
print('  Georgia dans le bloc .vnt6 :', bloc.count('Georgia'), ' (CONTROLE POSITIF : dans le fichier entier :',
      open(SRC,encoding='utf-8').read().count('Georgia'), ')')
