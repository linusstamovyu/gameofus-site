#!/usr/bin/env python3
"""Tiny HTTP sink that receives canvas frames from the running game.

Why this exists: the loops on the site are captured from the real game, and the
Browser pane cannot hand a few megabytes of base64 back through a tool result.
So the page POSTs one frame at a time to this server, which writes PNGs to disk.

    python3 tools/frame_sink.py --out /tmp/frames --port 5788

Then, in the game's page:

    await fetch("http://127.0.0.1:5788/frame/crown/0007", {
      method: "POST", body: canvas.toDataURL("image/png"),
    });

Frames are written as <out>/<clip>/<index>.png. Any existing frames for a clip
are left alone; re-posting the same index overwrites it.
"""

from __future__ import annotations

import argparse
import base64
import re
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

NAME = re.compile(r"^[a-z0-9_-]{1,40}$")
OUT = Path("/tmp/frames")


class Handler(BaseHTTPRequestHandler):
    protocol_version = "HTTP/1.1"

    def _cors(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def _reply(self, code: int, body: bytes = b"ok") -> None:
        self.send_response(code)
        self._cors()
        self.send_header("Content-Type", "text/plain")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self) -> None:  # noqa: N802 - BaseHTTPRequestHandler API
        self._reply(204, b"")

    def do_GET(self) -> None:  # noqa: N802
        # A health check, so the page can tell "sink is up" from "sink is down".
        self._reply(200, b"frame sink")

    def do_POST(self) -> None:  # noqa: N802
        parts = [p for p in self.path.split("/") if p]
        if len(parts) != 3 or parts[0] != "frame":
            self._reply(404, b"POST /frame/<clip>/<index>")
            return
        clip, index = parts[1], parts[2]
        if not NAME.match(clip) or not NAME.match(index):
            self._reply(400, b"bad name")
            return
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length).decode("ascii", "ignore")
        if "," in raw:
            raw = raw.split(",", 1)[1]
        try:
            png = base64.b64decode(raw)
        except Exception:
            self._reply(400, b"bad base64")
            return
        if not png.startswith(b"\x89PNG"):
            self._reply(400, b"not a png")
            return
        folder = OUT / clip
        folder.mkdir(parents=True, exist_ok=True)
        (folder / f"{index}.png").write_bytes(png)
        self._reply(200, str(len(png)).encode())

    def log_message(self, *_args) -> None:  # keep the console quiet
        pass


def main() -> None:
    global OUT
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default="/tmp/frames")
    ap.add_argument("--port", type=int, default=5788)
    args = ap.parse_args()
    OUT = Path(args.out)
    OUT.mkdir(parents=True, exist_ok=True)
    print(f"frame sink on http://127.0.0.1:{args.port} -> {OUT}", flush=True)
    ThreadingHTTPServer(("127.0.0.1", args.port), Handler).serve_forever()


if __name__ == "__main__":
    main()
