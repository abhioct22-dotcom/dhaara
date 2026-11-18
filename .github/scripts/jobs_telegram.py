"""Post Dhaara job alerts to a Telegram group/channel.
mode "new":     jobs added since the previous commit of jobs/index.json
mode "closing": open jobs whose last date is exactly 3 days away (IST)
Needs repo secrets TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID; does nothing without them."""
import json, os, subprocess, sys, html, urllib.request, urllib.parse
from datetime import datetime, timedelta, timezone

APP = "https://abhioct22-dotcom.github.io/dhaara/"
TOK, CHAT = os.environ.get("TELEGRAM_BOT_TOKEN", "").strip(), os.environ.get("TELEGRAM_CHAT_ID", "").strip()
IST = timezone(timedelta(hours=5, minutes=30))
EM = {"judiciary": "⚖️", "clerk": "📚", "faculty": "🎓", "intern": "🧑‍💼", "govt": "🏛️", "psu": "🏢", "firm": "💼"}

def load(rev):
    try:
        raw = subprocess.check_output(["git", "show", f"{rev}:jobs/index.json"], stderr=subprocess.DEVNULL)
        return json.loads(raw).get("jobs", [])
    except Exception:
        return []

def e(s): return html.escape(str(s or ""), quote=False)

def card(j):
    lines = [f"{EM.get(j.get('cat'), '📌')} <b>{e(j['t'][0])}</b>", f"🏛 {e(j['org'][0])}"]
    meta = []
    ps = str(j.get("posts", "")).strip()
    if ps and len(ps) <= 48 and ps[0].isdigit(): meta.append(f"👥 {e(ps)}" + (" posts" if ps.isdigit() else ""))
    if j.get("loc"): meta.append(f"📍 {e(j['loc'][0])}")
    if meta: lines.append(" · ".join(meta))
    if j.get("st") in (None, "open"):
        if j.get("lastTxt"): lines.append(f"⏳ Last date: {e(j['lastTxt'][0])}")
    elif j.get("st") == "rolling":
        lines.append("🔄 Rolling applications: apply any time")
    else:
        lines.append("🔔 Notification awaited: we'll post when it's out")
    lines.append(f'👉 <a href="{APP}#job={urllib.parse.quote(j["id"])}">Eligibility, how to apply &amp; official link</a>')
    return "\n".join(lines)

def send(text):
    data = urllib.parse.urlencode({"chat_id": CHAT, "text": text, "parse_mode": "HTML", "disable_web_page_preview": "true"}).encode()
    with urllib.request.urlopen(f"https://api.telegram.org/bot{TOK}/sendMessage", data, timeout=30) as r:
        res = json.load(r)
    if not res.get("ok"): sys.exit(f"Telegram error: {res}")

def main():
    if not TOK or not CHAT:
        print("Telegram secrets not set yet; skipping."); return
    mode = sys.argv[1] if len(sys.argv) > 1 else "new"
    now = load("HEAD")
    today = datetime.now(IST).date()
    if mode == "new":
        old = {j["id"] for j in load("HEAD~1")}
        pick = [j for j in now if j["id"] not in old and j.get("st") != "closed"]
        head = f"🆕 <b>New on Dhaara Jobs</b> · {today.strftime('%d %b %Y')}"
    elif mode == "all":
        pick = [j for j in now if j.get("st") != "closed"]
        head = f"📢 <b>Open jobs &amp; internships for law students</b> · {today.strftime('%d %b %Y')}"
    else:
        target = (today + timedelta(days=3)).isoformat()
        pick = [j for j in now if j.get("st") == "open" and j.get("last") == target]
        head = "⏰ <b>Closing in 3 days</b>: apply now"
    if not pick:
        print("Nothing to post."); return
    foot = f'\n\n📲 All jobs &amp; internships: <a href="{APP}">Dhaara</a>'
    chunk = head
    for j in pick:
        part = "\n\n" + card(j)
        if len(chunk) + len(part) + len(foot) > 3800:
            send(chunk + foot); chunk = head + " (contd.)"
        chunk += part
    send(chunk + foot)
    print(f"Posted {len(pick)} job(s).")

main()
