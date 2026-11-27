"""Generate Android and iOS app icons, notification icon and splash screens
from the same sunrise drawing as the web icons.
Run from the repo root after `npx cap add`: python3 scripts/make-app-icons.py (needs Pillow)."""
import math, os
from PIL import Image, ImageDraw

S = 1024
TOP, BOTTOM = (95, 75, 139), (233, 150, 74)  # plum -> dawn
PAPER = (251, 246, 238)
RES = "android/app/src/main/res"


def gradient(size=S):
    img = Image.new("RGBA", (size, size))
    d = ImageDraw.Draw(img)
    for y in range(size):
        t = y / size
        d.line([(0, y), (size, y)], fill=tuple(int(TOP[i] + (BOTTOM[i] - TOP[i]) * t) for i in range(3)) + (255,))
    return img


def glyph(scale, color=PAPER + (255,), faded=True):
    """The sun + page lines on a transparent square."""
    img = Image.new("RGBA", (S, S), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)
    cx, cy = S / 2, S * 0.5 + 90 * scale
    r = 210 * scale
    d.pieslice([cx - r, cy - r, cx + r, cy + r], 180, 360, fill=color)
    for ang in (-150, -120, -90, -60, -30):
        a = math.radians(ang)
        r1, r2 = r + 60 * scale, r + 150 * scale
        d.line([(cx + r1 * math.cos(a), cy + r1 * math.sin(a)), (cx + r2 * math.cos(a), cy + r2 * math.sin(a))],
               fill=color, width=int(44 * scale))
    w = 560 * scale
    for i in range(3):
        y = cy + 40 * scale + i * 80 * scale
        ww = w * (1 - 0.22 * i)
        alpha = 255 if (i == 0 or not faded) else 200 - i * 40
        d.rounded_rectangle([cx - ww / 2, y, cx + ww / 2, y + 36 * scale], radius=18 * scale, fill=color[:3] + (alpha,))
    return img


def full_icon(scale=0.85, mask=None):
    img = gradient()
    img.alpha_composite(glyph(scale))
    if mask == "round":
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).ellipse([0, 0, S, S], fill=255)
        img.putalpha(m)
    elif mask == "rounded":
        m = Image.new("L", (S, S), 0)
        ImageDraw.Draw(m).rounded_rectangle([0, 0, S, S], radius=230, fill=255)
        img.putalpha(m)
    return img


def save(img, path, size):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    img.resize(size if isinstance(size, tuple) else (size, size), Image.LANCZOS).save(path)


DENS = {"mdpi": 1, "hdpi": 1.5, "xhdpi": 2, "xxhdpi": 3, "xxxhdpi": 4}

# Launcher icons (legacy + adaptive layers). Adaptive safe zone is the middle 66 of 108.
legacy, rnd = full_icon(0.85, "rounded"), full_icon(0.72, "round")
fg = glyph(0.55)
bg = gradient()
for name, k in DENS.items():
    save(legacy, f"{RES}/mipmap-{name}/ic_launcher.png", int(48 * k))
    save(rnd, f"{RES}/mipmap-{name}/ic_launcher_round.png", int(48 * k))
    save(fg, f"{RES}/mipmap-{name}/ic_launcher_foreground.png", int(108 * k))
    save(bg, f"{RES}/mipmap-{name}/ic_launcher_background.png", int(108 * k))
    # Notification icon: white silhouette on transparent (Android tints it).
    save(glyph(1.0, (255, 255, 255, 255), faded=False), f"{RES}/drawable-{name}/ic_stat_futurejournal.png", int(24 * k))

for xml in ("ic_launcher.xml", "ic_launcher_round.xml"):
    with open(f"{RES}/mipmap-anydpi-v26/{xml}", "w") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">\n'
                '    <background android:drawable="@mipmap/ic_launcher_background"/>\n'
                '    <foreground android:drawable="@mipmap/ic_launcher_foreground"/>\n'
                '    <monochrome android:drawable="@mipmap/ic_launcher_foreground"/>\n</adaptive-icon>\n')
for old in (f"{RES}/drawable/ic_launcher_background.xml", f"{RES}/drawable-v24/ic_launcher_foreground.xml"):
    if os.path.exists(old):
        os.remove(old)


def splash(w, h, icon_px):
    img = Image.new("RGB", (w, h), PAPER)
    ic = full_icon(0.85, "rounded").resize((icon_px, icon_px), Image.LANCZOS)
    img.paste(ic, ((w - icon_px) // 2, (h - icon_px) // 2), ic)
    return img

import glob
for p in glob.glob(f"{RES}/drawable*/splash.png"):
    w, h = Image.open(p).size
    splash(w, h, int(min(w, h) * 0.28)).save(p)

# iOS
ios = "ios/App/App/Assets.xcassets"
full_icon(0.85).convert("RGB").save(f"{ios}/AppIcon.appiconset/AppIcon-512@2x.png")
for p in glob.glob(f"{ios}/Splash.imageset/*.png"):
    splash(2732, 2732, 520).save(p)
print("app icons written")
