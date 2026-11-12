#!/usr/bin/env python3
# Juge donnees ⊥ ㉟ — mesure B sur la pile locale.
# Jeton JAMAIS ecrit ici : il vit dans le scratchpad (chemin passe par $JD_TOKEN_FILE).
# Chaque corps : on compare la TAILLE ECRITE a Content-Length (piege outil du dossier).
import json
import os
import sys
import urllib.error
import urllib.request
import uuid

BASE = "http://localhost/v1"
OUT = os.path.dirname(os.path.abspath(__file__))


def call(method, path, body=None, token=None, tag=None, extra_headers=None):
    url = BASE + path
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    if token:
        req.add_header("Authorization", "Bearer " + token)
    for k, v in (extra_headers or {}).items():
        req.add_header(k, v)
    try:
        with urllib.request.urlopen(req) as r:
            raw = r.read()
            status, headers = r.status, dict(r.headers)
    except urllib.error.HTTPError as e:
        raw = e.read()
        status, headers = e.code, dict(e.headers)
    cl = headers.get("Content-Length")
    written = len(raw)
    ok_len = (cl is None) or (int(cl) == written)
    meta = {
        "request": {"method": method, "url": url, "body": body},
        "status": status,
        "x_server_build": headers.get("X-Server-Build"),
        "content_length_header": cl,
        "octets_ecrits": written,
        "taille_conforme": ok_len,
    }
    try:
        parsed = json.loads(raw.decode())
    except Exception:
        parsed = {"__non_json__": raw.decode(errors="replace")}
    meta["body"] = parsed
    if tag:
        with open(os.path.join(OUT, tag + ".json"), "w") as f:
            json.dump(meta, f, indent=2, ensure_ascii=False, sort_keys=False)
    if not ok_len:
        print("!!! TAILLE NON CONFORME pour %s : Content-Length=%s ecrits=%d" % (tag, cl, written))
    return meta


def main():
    tokfile = os.environ["JD_TOKEN_FILE"]
    step = sys.argv[1]

    if step == "signup":
        cs = "jd3-" + uuid.uuid4().hex[:10]
        pw = "pw-" + uuid.uuid4().hex[:12]
        m = call("POST", "/auth/signup", {"callsign": cs, "password": pw},
                 tag="01-signup", extra_headers={"Idempotency-Key": str(uuid.uuid4())})
        tok = m["body"].get("payload", {}).get("data", {}).get("access_token")
        # masquage dans le fichier ecrit
        with open(os.path.join(OUT, "01-signup.json")) as f:
            txt = f.read()
        if tok:
            txt = txt.replace(tok, "***JETON-MASQUE***")
        txt = txt.replace(pw, "***MDP-MASQUE***")
        d = json.loads(txt)
        d["request"]["body"]["password"] = "***MDP-MASQUE***"
        with open(os.path.join(OUT, "01-signup.json"), "w") as f:
            json.dump(d, f, indent=2, ensure_ascii=False)
        with open(tokfile, "w") as f:
            f.write(tok or "")
        print("status=%s callsign=%s build=%s jeton_recu=%s" % (m["status"], cs, m["x_server_build"], bool(tok)))
        return

    with open(tokfile) as f:
        tok = f.read().strip()

    if step == "session-open":
        m = call("POST", "/session/open", {}, token=tok, tag="02-session-open")
    elif step == "dealers":
        m = call("GET", "/operational/dealers", token=tok, tag=sys.argv[2])
    elif step == "get":
        m = call("GET", sys.argv[2], token=tok, tag=sys.argv[3])
    elif step == "post":
        m = call("POST", sys.argv[2], json.loads(sys.argv[3]), token=tok, tag=sys.argv[4])
    else:
        raise SystemExit("etape inconnue: " + step)
    print("status=%s build=%s len=%s/%s conforme=%s" % (
        m["status"], m["x_server_build"], m["octets_ecrits"], m["content_length_header"], m["taille_conforme"]))
    print(json.dumps(m["body"], ensure_ascii=False)[:1400])


main()
