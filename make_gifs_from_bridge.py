"""
Assembles animated GIFs from bridge-captured PNG frames.
Run after: bridge run  (in ALs-Homeassitant-Energiebilanz-Card/)
Output: screenshots/card-demo.gif  +  screenshots/editor-demo.gif
"""
import os
from PIL import Image

FRAME_DIR = "screenshots/gif-frames"
BG_COLOR  = (255, 255, 255)

# (filename_stem, duration_ms)
GIF1_FRAMES = [
    ("g1-01-day-initial",       3000),
    ("g1-02-day-haus-open",     3000),
    ("g1-03-day-both-open",     3000),
    ("g1-04-day-hover-8h",      3000),
    ("g1-05-day-bat-hidden",    2000),  # 2 s ausgeblendet
    ("g1-06-day-bat-shown",     3000),
    ("g1-07-day-may3",          3000),
    ("g1-08-day-may3-open",     3000),
    ("g1-09-day-may3-closed",   3000),
    ("g1-10-month-may",         3000),
    ("g1-11-month-hover-may3",  3000),
    ("g1-12-month-einsp-hidden",2000),  # 2 s ausgeblendet
    ("g1-13-month-einsp-shown", 3000),
    ("g1-14-month-april",       3000),
    ("g1-15-month-hover-apr21", 3000),
    ("g1-16-year-2026",         3000),
    ("g1-17-year-open",         2000),  # 2 s aufgeklappt
    ("g1-18-year-closed",       3000),
    ("g1-19-year-hover-april",  3000),
    ("g1-20-total-view",        3000),
    ("g1-21-total-hover-2026",  3000),
]

GIF2_FRAMES = [
    ("g2-e01-editor-main",    3000),
    ("g2-e02-design-open",    3000),
    ("g2-e03-design-closed",  3000),
    ("g2-e04-lang-open",      3000),
    ("g2-e05-lang-closed",    3000),
    ("g2-e06-pv-open",        3000),
    ("g2-e07-pv-closed",      3000),
    ("g2-e08-einsp-open",     3000),
    ("g2-e09-einsp-closed",   3000),
    ("g2-e10-scroll-bottom",  3000),
    ("g2-e11-pvsub2-open",    3000),
    ("g2-e12-pvsub2-closed",  3000),
]

def load_frames(frame_list):
    frames, durations = [], []
    missing = []
    for stem, ms in frame_list:
        path = os.path.join(FRAME_DIR, stem + ".png")
        if not os.path.exists(path):
            missing.append(stem)
            continue
        img = Image.open(path).convert("RGB")
        frames.append(img)
        durations.append(ms)
    if missing:
        print(f"  FEHLT: {missing}")
    return frames, durations

def normalize(frames):
    if not frames:
        return frames
    max_w = max(f.size[0] for f in frames)
    max_h = max(f.size[1] for f in frames)
    result = []
    for img in frames:
        w, h = img.size
        if w == max_w and h == max_h:
            result.append(img)
            continue
        canvas = Image.new("RGB", (max_w, max_h), BG_COLOR)
        canvas.paste(img, ((max_w - w) // 2, (max_h - h) // 2))
        result.append(canvas)
    return result

def make_gif(frame_list, out_path):
    print(f"\nErstelle {out_path} ...")
    frames, durations = load_frames(frame_list)
    if not frames:
        print("  Keine Frames gefunden – übersprungen.")
        return
    frames = normalize(frames)
    frames[0].save(
        out_path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=0,
        optimize=True,
    )
    size_kb = os.path.getsize(out_path) // 1024
    print(f"  => {len(frames)} Frames, {frames[0].size}, {size_kb} KB")

os.makedirs("screenshots", exist_ok=True)
make_gif(GIF1_FRAMES, "screenshots/card-demo.gif")
make_gif(GIF2_FRAMES, "screenshots/editor-demo.gif")
print("\nFertig!")
