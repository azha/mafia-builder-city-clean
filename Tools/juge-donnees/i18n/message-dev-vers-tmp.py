#!/usr/bin/env python3
"""Portage de la garde MessageDeDevHorsTmp (f2 2026-09-26) : aucun message d'erreur de développeur (le `message` d'un onErr
de client) n'arrive dans un texte montré au joueur. Mesure statique ; même règle que le test PlayMode.

Graines : le DERNIER paramètre d'une lambda d'erreur `(code|c|http|status, x) =>` ou `(c, y, x) =>` passée à un appel
`…client….Methode(` — la parenthèse qui englobe la lambda (`_` exclu).
Portée : par MEMBRE (bloc ouvert directement dans un corps de classe). Un nom déclaré au niveau de la classe (champ,
propriété) porteur dans un membre l'est dans tous.
Propagation : `X = expr` ou `X ??= expr` rend X porteur si expr CITE un porteur hors des arguments d'un appel — un appel
(`ClasserRefus(code, msg)`, `Lib(...)`) rend autre chose que le message. Point fixe.
Puits : `.text =`, `NewText(`, `Texte(`, `SetText(`, `SetOutcome(`, `RenderDiagnostics(`, jusqu'au `;`. Un porteur cité
seulement en test de nullité ne compte pas.
Un porteur passé en argument à une méthode DU MÊME FICHIER rend porteur le paramètre de même rang (`ApresDecision(ok, code, msg)`).
Limite (assumée, écrite) : insensible à l'ordre des instructions — réaffecter un porteur ne le blanchit pas : on écrit alors
la phrase affichée dans une locale.
Hors champ : les *Client.cs (ils produisent le message), les Tests."""
import re, sys, pathlib

RACINE = pathlib.Path(__file__).resolve().parents[3]
LAMBDA = re.compile(r'\(\s*(?:code|c|http|status)\s*,\s*(?:(\w+)\s*,\s*)?(\w+)\s*\)\s*=>')
APPEL_CLIENT = re.compile(r'\b\w*[Cc]lient\w*\s*\.\s*\w+\s*\($')
AFFECT = re.compile(r'\b([A-Za-z_]\w*)\s*(?:\?\?)?=(?![=>])')
PUITS = re.compile(r'(\.text\s*=(?!=)|\bNewText\(|\bTexte\(|\bSetText\(|\bSetOutcome\(|\bRenderDiagnostics\()')
NULLITE = [r'string\.IsNullOrEmpty\(\s*{n}\s*\)', r'string\.IsNullOrWhiteSpace\(\s*{n}\s*\)',
           r'(?<![\w.]){n}\s*[!=]=\s*null', r'null\s*[!=]=\s*{n}\b']
DECL = re.compile(r'\b[\w<>\[\],.?]+\s+(\w+)\s*(?:[;={]|=>)')


def vide(s, motif):
    return re.sub(motif, lambda m: re.sub(r'[^\n]', ' ', m.group(0)), s, flags=re.S)


def nettoyer(source):
    """Commentaires blanchis (lignes gardées) ; `nu` a en plus ses chaînes vidées (les accolades d'une chaîne ne comptent pas)."""
    s = vide(source, r'/\*.*?\*/')
    s = vide(s, r'//[^\n]*')
    nu = vide(s, r'@"(?:""|[^"])*"')
    nu = re.sub(r'"(?:\\.|[^"\\\n])*"', lambda m: '"' + ' ' * (len(m.group(0)) - 2) + '"', nu)
    nu = re.sub(r"'(?:\\.|[^'\\\n])'", lambda m: "'" + ' ' * (len(m.group(0)) - 2) + "'", nu)
    return s, nu


def fin_expression(nu, i):
    """Fin de l'expression à droite d'un `=` : le `;`, ou le `,` / `)` / `}` qui ferme son niveau (une lambda d'argument)."""
    prof, k = 0, i
    while k < len(nu):
        c = nu[k]
        if c in '([{': prof += 1
        elif c in ')]}':
            if prof == 0: break
            prof -= 1
        elif (c == ',' and prof == 0) or c == ';': break
        k += 1
    return k


def sans_arguments_d_appel(expr):
    """`f(a, b)` → `f()` : ce qu'un appel rend n'est pas son argument. Garde les parenthèses de groupement."""
    out, k = [], 0
    while k < len(expr):
        m = re.compile(r'\b\w+\s*\(').search(expr, k)
        if not m or re.match(r'(if|while|for|foreach|switch|return|catch|using|lock|nameof|typeof)\b', m.group(0)):
            if not m: out.append(expr[k:]); break
            out.append(expr[k:m.end()]); k = m.end(); continue
        out.append(expr[k:m.end()])
        prof, j = 1, m.end()
        while j < len(expr) and prof:
            prof += {'(': 1, ')': -1}.get(expr[j], 0); j += 1
        out.append(')'); k = j
    return ''.join(out)


def membres(nu):
    """[(debut, fin)] des blocs ouverts directement dans un corps de classe, et le texte au niveau des classes."""
    pile, blocs, niveau_classe = [], [], []
    dernier = 0
    for k, c in enumerate(nu):
        if c == '{':
            entete = nu[dernier:k]
            est_classe = re.search(r'\b(class|struct|interface|record)\b', entete) is not None
            parent_classe = bool(pile) and pile[-1][1]
            pile.append((k, est_classe, parent_classe))
            dernier = k + 1
        elif c == '}':
            if pile:
                d, est_classe, parent_classe = pile.pop()
                if parent_classe and not est_classe: blocs.append((d, k))
            dernier = k + 1
        elif c == ';':
            dernier = k + 1
    blocs.sort()
    for d, f in blocs:
        pass
    return blocs


def champs(nu, blocs):
    masque = list(nu)
    for d, f in blocs:
        for k in range(d + 1, f): masque[k] = ' '
    return set(m.group(1) for m in DECL.finditer(''.join(masque)))


def signature(nu, d):
    """(nom, [paramètres]) du membre dont le corps s'ouvre en `d`, ou None."""
    debut = max(nu.rfind(';', 0, d), nu.rfind('}', 0, d), nu.rfind('{', 0, d))
    m = re.search(r'(\w+)\s*\(([^()]*)\)\s*(?:where[^{]*)?$', nu[debut + 1:d])
    if not m: return None
    params = [re.findall(r'(\w+)\s*(?:=[^,]*)?$', x.strip()) for x in m.group(2).split(',') if x.strip()]
    return m.group(1), [x[0] if x else None for x in params]


def arguments(s, nu, i):
    """Les arguments d'un appel dont `(` est en `i` : textes au niveau 0."""
    prof, k, debut, out = 0, i, i + 1, []
    while k < len(nu):
        c = nu[k]
        if c in '([{': prof += 1
        elif c in ')]}':
            prof -= 1
            if prof == 0: out.append(s[debut:k]); break
        elif c == ',' and prof == 1: out.append(s[debut:k]); debut = k + 1
        k += 1
    return out


def appel_client_englobant(nu, i):
    """La lambda en `i` est-elle un argument d'un appel `…client….Methode(` ? On remonte à la parenthèse qui l'englobe."""
    prof, k = 0, i - 1
    while k >= 0:
        c = nu[k]
        if c in ')]}': prof += 1
        elif c in '([{':
            if prof == 0:
                return c == '(' and APPEL_CLIENT.search(nu[max(0, k - 160):k + 1]) is not None
            prof -= 1
        k -= 1
    return False


def cite(nom, expr):
    return re.search(r'(?<![\w.])%s\b' % re.escape(nom), expr) is not None


def violations(source):
    s, nu = nettoyer(source)
    blocs = membres(nu)
    # un membre imbriqué (propriété dans une classe imbriquée) reste un membre ; les blocs à l'intérieur d'un membre n'en sont pas
    haut = []
    for d, f in blocs:
        if not any(d0 < d and f <= f0 for d0, f0 in blocs): haut.append((d, f))
    niveau = champs(nu, haut)
    sigs = {}
    for d, f in haut:
        sg = signature(nu, d)
        if sg: sigs.setdefault(sg[0], []).append(((d, f), sg[1]))
    porteurs_champs, locaux, params = set(), {}, {}
    for _ in range(20):
        avant = len(porteurs_champs) + sum(len(v) for v in params.values())
        for d, f in haut:
            p = set(porteurs_champs) | params.get((d, f), set())
            for m in LAMBDA.finditer(nu, d, f):
                if m.group(2) != '_' and appel_client_englobant(nu, m.start()): p.add(m.group(2))
            while True:
                n = len(p)
                for m in AFFECT.finditer(nu, d, f):
                    if m.group(1) in p: continue
                    expr = sans_arguments_d_appel(s[m.end():fin_expression(nu, m.end())])
                    if any(cite(x, expr) for x in p): p.add(m.group(1))
                if len(p) == n: break
            locaux[(d, f)] = p
            porteurs_champs |= {x for x in p if x in niveau}
            for m in re.finditer(r'(?<![\w.])(\w+)\s*\(', nu[:f]):
                if m.start() < d or m.group(1) not in sigs: continue
                args = arguments(s, nu, m.end() - 1)
                for rang, a in enumerate(args):
                    a = sans_arguments_d_appel(a)
                    if not any(cite(x, a) for x in p): continue
                    for cible, noms in sigs[m.group(1)]:
                        if rang < len(noms) and noms[rang]: params.setdefault(cible, set()).add(noms[rang])
        if len(porteurs_champs) + sum(len(v) for v in params.values()) == avant: break
    out = []
    for d, f in haut:
        p = locaux[(d, f)] | porteurs_champs | params.get((d, f), set())
        if not p: continue
        for m in PUITS.finditer(nu, d, f):
            fin = nu.find(';', m.end())
            stmt = s[m.end(): fin if fin >= 0 else f]
            stmt = sans_arguments_d_appel(stmt) if m.group(0).endswith('=') else \
                   sans_arguments_d_appel('(' + stmt)[1:]
            for x in p:
                for n in NULLITE: stmt = re.sub(n.format(n=re.escape(x)), 'true', stmt)
            cites = sorted(x for x in p if cite(x, stmt))
            if cites: out.append((s.count('\n', 0, m.start()) + 1, cites))
    return out


TEMOIN = '''class T { string Err { get; set; }
  void A() { client.Get(t, d => {}, (code, msg) => Err = $"{code}: {msg}"); }
  void B() { lbl.text = Err; }
  void C() { string m = null; client.Post(t, () => {}, (c, x) => m = x); SetOutcome(Lib("Échec — ") + m, rouge); }
  void E() { string m = null; client.Post(t, () => {}, (c, x) => m = x); Apres(m); }
  void Apres(string raison) { lbl.text = raison ?? ""; }
  void D() { string m = null; client.Post(t, () => {}, (c, x) => m = x); SetOutcome(Mot(Classer(c, m)), rouge); lbl.text = m == null ? "a" : "b"; }
}'''


def main():
    total = 0
    for f in sorted((RACINE / 'Assets/Scripts').rglob('*.cs')):
        if f.name.endswith('Client.cs'): continue
        for ligne, cites in violations(f.read_text(encoding='utf-8')):
            total += 1
            print(f'{f.relative_to(RACINE)}:{ligne}\t{",".join(cites)}')
    t = violations(TEMOIN)
    print(f'contrôle positif : {[l for l, _ in t]} (attendu [3, 4, 6])')
    print(f'{total} site(s)')
    return 1 if total or [l for l, _ in t] != [3, 4, 6] else 0


if __name__ == '__main__':
    sys.exit(main())
