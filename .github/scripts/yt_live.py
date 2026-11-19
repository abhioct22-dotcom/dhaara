"""Find live and upcoming sessions on the StudyIQ Judiciary YouTube channel and write live.json.
Needs the repository secret YT_API_KEY (a YouTube Data API v3 key). Costs about 1 quota unit per run."""
import json, os, re, sys, urllib.request, urllib.parse, datetime
KEY = os.environ.get("YT_API_KEY", "").strip()
CHANNEL = os.environ.get("YT_CHANNEL_ID", "").strip() or "UCEcEZdnUG6yHGczVAflH--g"
TEACHERS = ["Nishank Agarwal", "Rekha Rathore", "Pranjal Singh"]
ONLY_TEACHERS = os.environ.get("YT_ONLY_TEACHERS", "1") != "0"
if not KEY:
    print("YT_API_KEY is not set; nothing to do."); sys.exit(0)
def get(url):
    with urllib.request.urlopen(urllib.request.Request(url, headers={"User-Agent": "dhaara-live/1"}), timeout=30) as r:
        return r.read().decode("utf-8", "replace")
def ts(s):
    return int(datetime.datetime.fromisoformat(s.replace("Z", "+00:00")).timestamp() * 1000) if s else None
feed = get("https://www.youtube.com/feeds/videos.xml?channel_id=" + urllib.parse.quote(CHANNEL))
ids = list(dict.fromkeys(re.findall(r"<yt:videoId>([\w-]{11})</yt:videoId>", feed)))[:25]
items = []
if ids:
    q = urllib.parse.urlencode({"part": "snippet,liveStreamingDetails", "id": ",".join(ids), "key": KEY, "maxResults": 50})
    data = json.loads(get("https://www.googleapis.com/youtube/v3/videos?" + q))
    now = int(datetime.datetime.now(datetime.timezone.utc).timestamp() * 1000)
    for v in data.get("items", []):
        sn, ld = v.get("snippet", {}), v.get("liveStreamingDetails") or {}
        state = sn.get("liveBroadcastContent")
        if state not in ("live", "upcoming"): continue
        start = ts(ld.get("actualStartTime")) or ts(ld.get("scheduledStartTime"))
        if not start or (state == "upcoming" and (start < now - 3 * 3600000 or start > now + 3 * 86400000)): continue
        text = (sn.get("title", "") + " " + sn.get("description", "")).lower()
        teacher = next((t for t in TEACHERS if t.lower() in text or t.split()[0].lower() + " sir" in text or t.split()[0].lower() + " ma'am" in text or t.split()[0].lower() + " mam" in text), "")
        if ONLY_TEACHERS and not teacher: continue
        items.append({"id": v["id"], "url": "https://www.youtube.com/watch?v=" + v["id"], "title": sn.get("title", "")[:110], "teacher": teacher, "start": start, "live": state == "live"})
items.sort(key=lambda x: x["start"])
new = {"items": items}
old = None
try: old = json.load(open("live.json"))
except Exception: pass
if old is None or old.get("items") != items:
    new["at"] = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")
    json.dump(new, open("live.json", "w"), ensure_ascii=False, indent=1)
    print("live.json updated:", len(items), "session(s)")
else:
    print("no change:", len(items), "session(s)")
