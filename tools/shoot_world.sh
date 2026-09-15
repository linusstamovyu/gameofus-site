#!/bin/zsh
# Screenshot the whole map for one world, headless.  Dev server must be on :5391 (launch config "gameofus-worlds").
#   tools/shoot_world.sh <world> <time-seconds> <out.png> [T=48]
world=$1; t=${2:-1.5}; out=$3; T=${4:-48}
w=$((22*T)); h=$((18*T))
rm -f "$out"; dir=$(mktemp -d)
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" --headless=new --disable-gpu --hide-scrollbars --no-first-run \
  --user-data-dir="$dir" --window-size=$w,$h --screenshot="$out" \
  "http://localhost:5391/world-lab.html?world=$world&t=$t&T=$T" > "$dir/log" 2>&1 &
pid=$!
for i in $(seq 1 45); do [[ -s "$out" ]] && break; sleep 1; done
kill $pid 2>/dev/null; pkill -f "$dir" 2>/dev/null; rm -rf "$dir"
[[ -s "$out" ]] && echo "wrote $out" || { echo "no screenshot (is the dev server on :5391?)"; exit 1; }
