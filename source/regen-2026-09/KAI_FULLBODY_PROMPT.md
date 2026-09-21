# Kai full-body — prompt v4

**Attach four files:** `kai_photo_cut.webp` (the real photo), `kai_fullbody_game_style_v1.png` (the last
output — the STYLE and STANCE reference), `kai_proportion_spec.png` and `kai_stance_spec.png`.

---

## The prompt — paste from here

> Redraw this character full-body. **Attachment 2 is the style and pose you are matching; attachment 1 is the
> real person whose proportions you must hit.** The two will be shown standing side by side at the same
> height on a web page, so they have to read as the same body.
>
> ### Style — copy attachment 2 exactly
> Keep its rendering unchanged: flat cel shading with a small number of tones per surface, crisp dark
> outline, no soft gradients, no glow, no painterly blending, no background. Same face, same hair shape and
> colour, same grey t-shirt, same blue-and-white vertically striped trousers, same silver chain, same
> wristwatch, same white trainers. **Only the proportions and the trouser length change.**
>
> ### Camera and stance — keep what attachment 2 already does well
> - Camera at chest height, level.
> - Body turned about **15° away from camera**, his right side nearer the lens. Head turned back to the
>   camera. Not a symmetrical front view.
> - Weight on his left leg (the viewer's right). **Shoulder line tilts: the viewer's-left shoulder about 3%
>   of total height higher** than the other.
> - **His head sits about 10% of his body width to the viewer's right of the midpoint between his feet** — he
>   is not stacked in a straight vertical line.
> - Feet apart and staggered; the viewer's-right sole about **4% of total height lower** in frame. The
>   viewer's-left foot angled outward.
> - Arms loose at his sides, elbows slightly bent, hands relaxed and softly curled.
>
> ### Composition — measure from the crown (0%) to the soles (100%)
> These three must ALL land, not one or two of them:
>
> | landmark | must be at | attachment 2 currently |
> |---|---|---|
> | **bottom of the t-shirt (hem)** | **49.5%** | 45.5% — too high, torso too short |
> | **top of the visible shoe** | **91.8%** | 87.3% — too high, trousers too short |
> | **chin (bottom of the head)** | **14.1%** | 15.0% — head too big |
>
> Also: he is **7.1 heads tall** (attachment 2 is 6.7 — the head is too large for the body). Head width
> **13.9%** of total height; **shoulders 1.36× the head's width** at this 15° turn. In attachment 2 the head
> is as wide as the shoulders, which makes him read as a stylised mascot rather than as this man.
>
> ### Stance width — the feet
> This is what the last version got most wrong. Measured across the figure's own silhouette:
> - **His feet are CLOSE TOGETHER**, spanning about **77% of the silhouette's width**, not 91%. Do not splay
>   them apart.
> - **The widest points of the whole figure are his HANDS, not his shoes.** Neither shoe may stick out
>   further to the side than his hands do. In the last version the right shoe was the widest thing in the
>   picture, which is wrong.
> - **The feet sit slightly LEFT of the centre of the silhouette** — their midpoint is at about 44% of the
>   width, not 54%. He is not standing with his feet centred under a body that leans away from them.
>
> **Longer torso, shorter legs, longer trousers.** The t-shirt comes down to just below the hips. The
> trousers are long and loose and **break over the tops of the shoes** — the hem crumples on the instep,
> covering the ankle and the back half of each trainer, so only the toe and the front of the sole are
> visible. Do not show the whole shoe.
>
> ### Deliver two images
> 1. **The character alone**, transparent background, no ground shadow, nothing cropped — full figure from
>    above the crown to below the soles.
> 2. **A side-by-side check image**: the character you just drew placed next to the attached photograph,
>    both scaled to exactly the same total height, standing on a common baseline, on a plain background.
>    Draw three horizontal guide lines across both at 14.1%, 49.5% and 91.8% of height. This is for me to
>    judge whether the three landmarks actually line up between the two figures — if they do not, correct
>    the character and produce both images again.

---

## Pass / fail

The check image exists so these can be read off it. On a passing result all three lines cross **the same
feature** on both figures: the line at 14.1% touches both chins, 49.5% both shirt hems, 91.8% the top of
both visible shoes.

Verify numerically rather than by eye — the eye is poor at a few percent across two different pictures:

```bash
python3 gameofus-site/tools/measure_figure_proportions.py \
  --against gameofus-site/public/lab/kai_photo_cut.webp <new file>
```

Targets: head height 14.1, head width 13.9, shoulder width 18.9, heads tall 7.10, hem 49.5, shoe top 91.8.
Within about a point on each is a pass.

## Notes

- **Do not brief against the crotch.** It is not measurable on this photo — the trousers are loose enough
  that the legs never separate — and an earlier version of this brief quoted a crotch figure that was
  actually the armpit.
- Width readings move with the body's turn, so treat the head and shoulder widths as guidance and the three
  vertical landmarks as the hard requirement.
- If the result is right everywhere except the hem, it can be corrected without regenerating:
  `python3 gameofus-site/tools/fit_figure_to_photo.py <art> <photo> <out.webp>` stretches along y only,
  which is safe on vertical stripes. It cannot invent the trouser break over the shoes.
