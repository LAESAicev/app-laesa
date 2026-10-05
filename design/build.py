"""Bundle design/src pages into self-contained HTML (desktop + mobile) for preview and html_to_figma.

usage: python3 design/build.py            -> builds every page in PAGES
"""
import re
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
DIST = ROOT / "dist"

# page file -> nav item marked active
PAGES = {
    "home.html": "inicio",
    "processos-seletivos.html": "processos",
    "contato.html": "contato",
}
NAV_KEYS = ["inicio", "sobre", "como", "projetos", "diretoria", "processos", "contato"]
FONTS = '<link href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Geist:wght@400;500;600;700&family=Geist+Mono:wght@400;500;600&display=swap" rel="stylesheet">'


BRAND = ROOT.parent / "brand" / "logo"
LOGO_FILES = {"h": BRAND / "horizontal" / "laesa-horizontal-navy.svg", "icon": BRAND / "icone" / "laesa-icone-navy.svg"}


def svg(path: Path) -> str:
    return path.read_text().strip()


def brand_logo(kind: str) -> str:
    """Official logo from brand/, normalized: 0,0 viewBox (cropped by CSS .lg) and fill=currentColor."""
    art = svg(LOGO_FILES[kind])
    w, h = re.search(r'width="(\d+)" height="(\d+)"', art).groups()
    art = re.sub(r"<svg[^>]*>", f'<svg viewBox="0 0 {w} {h}" fill="none" xmlns="http://www.w3.org/2000/svg">', art, count=1)
    return re.sub(r'fill="#[0-9A-Fa-f]{6}"', 'fill="currentColor"', art)


def render(text: str, active: str, mode: str) -> str:
    def partial(m):
        return (SRC / "partials" / f"{m.group(1)}.html").read_text()

    for _ in range(3):  # partials may include partials
        text = re.sub(r"\{\{>\s*([\w-]+)\s*\}\}", partial, text)
    text = text.replace("{{mode}}", mode)
    # Logos: html_to_figma drops this artwork, so in Figma the layer named "logo/<variant>" is swapped
    # for the matching Logo component. {{logo-h:#hex}} / {{logo-icon:#hex}} pick the color (and variant).
    variants = {("h", "#043F63"): "horizontal-navy", ("h", "#EAF4FA"): "horizontal-claro",
                ("icon", "#0B688D"): "icone-foto", ("icon", "#D7E0E6"): "icone-foto-claro"}

    def logo(m):
        kind, color = m.group(1), m.group(2) or "#043F63"
        art = brand_logo(kind).replace('fill="currentColor"', f'fill="{color}"')
        name = variants.get((kind, color), f"{kind}-{color}")
        return f'<span class="lg lg-{"h" if kind == "h" else "i"}" role="img" aria-label="logo/{name}">{art}</span>'

    text = re.sub(r"\{\{logo-(h|icon)(?::(#[0-9A-Fa-f]{6}))?\}\}", logo, text)
    # role/aria-label name the layer in Figma ("icon/arrow"), so screens can be swapped to component instances
    text = re.sub(
        r"\{\{icon:([\w-]+)\}\}",
        lambda m: svg(SRC / "icons" / f"{m.group(1)}.svg").replace("<svg ", f'<svg role="img" aria-label="icon/{m.group(1)}" ', 1),
        text,
    )
    for key in NAV_KEYS:
        text = text.replace(f"{{{{on:{key}}}}}", "on" if key == active else "")
    leftover = re.findall(r"\{\{[^}]+\}\}", text)
    if leftover:
        raise SystemExit(f"unresolved tokens: {leftover}")
    return text


def main():
    DIST.mkdir(exist_ok=True)
    css = (SRC / "styles.css").read_text()
    for name, active in PAGES.items():
        src = SRC / name
        if not src.exists():
            continue
        body = src.read_text()
        stem = Path(name).stem
        head = f'<!doctype html><html lang="pt-BR"><head><meta charset="utf-8">'
        bodies = {}
        for mode, suffix, width in (("", "desktop", 1440), ("m", "mobile", 390)):
            bodies[suffix] = render(body, active, mode)
            html = (
                f'{head}<meta name="viewport" content="width={width}"><title>LAESA · {stem} · {suffix}</title>{FONTS}'
                f"<style>{css}</style></head><body>{bodies[suffix]}</body></html>"
            )
            out = DIST / f"{stem}-{suffix}.html"
            out.write_text(html)
            print(out.relative_to(ROOT.parent))
        # desktop + mobile side by side in one document: what html_to_figma receives (cssSelector .page)
        out = DIST / f"{stem}-figma.html"
        out.write_text(
            f'{head}<title>LAESA · {stem} · figma</title>{FONTS}<style>{css}</style></head>'
            f'<body style="display:flex;gap:200px;align-items:flex-start;width:max-content">'
            f'{bodies["desktop"]}{bodies["mobile"]}</body></html>'
        )
        print(out.relative_to(ROOT.parent))


if __name__ == "__main__":
    main()
