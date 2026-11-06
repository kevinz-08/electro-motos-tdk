"""
Genera los manuales de uso del panel de administración (un PDF por ruta).

Uso (desde la raíz del repo):
    python docs/manuales-admin/build.py

Requiere Google Chrome instalado (impresión a PDF en modo headless).
Salida: docs/manuales-admin/pdf/<NN>-<ruta>.pdf  +  fuentes HTML en docs/manuales-admin/html/.
Para cambiar un manual, edita su entrada en `data.py` y vuelve a ejecutar.
"""
import pathlib
import subprocess
import sys

from data import MANUALS  # noqa: E402

ROOT = pathlib.Path(__file__).resolve().parent
HTML_DIR = ROOT / "html"
PDF_DIR = ROOT / "pdf"
CHROME_CANDIDATES = [
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
]

CSS = """
@page { size: A4; margin: 12mm 14mm 12mm 14mm; }
* { box-sizing: border-box; }
body { font-family: "Segoe UI", Arial, sans-serif; color: #1f2933; font-size: 9.6pt; line-height: 1.36; margin: 0; }
.head { border-bottom: 3px solid #e11d48; padding-bottom: 8px; margin-bottom: 10px; }
.kicker { color: #e11d48; font-weight: 700; letter-spacing: 1.5px; font-size: 8.5pt; text-transform: uppercase; }
h1 { font-size: 21pt; margin: 2px 0 2px; color: #0f172a; }
.route { font-family: Consolas, monospace; font-size: 10pt; color: #475569; background: #f1f5f9; padding: 1px 7px; border-radius: 4px; }
.lead { font-size: 10.5pt; color: #334155; margin: 8px 0 4px; }
h2 { font-size: 12pt; color: #be123c; margin: 11px 0 3px; }
h3 { font-size: 10.5pt; color: #0f172a; margin: 10px 0 2px; }
p { margin: 5px 0; }
ul, ol { margin: 5px 0 5px 20px; padding: 0; }
li { margin: 2px 0; }
table { width: 100%; border-collapse: collapse; margin: 5px 0 8px; font-size: 8.9pt; page-break-inside: avoid; }
th { background: #0f172a; color: #fff; text-align: left; padding: 5px 7px; }
td { border: 1px solid #cbd5e1; padding: 4px 7px; vertical-align: top; }
tr:nth-child(even) td { background: #f8fafc; }
.box { border-left: 4px solid #e11d48; background: #fff1f2; padding: 7px 11px; margin: 9px 0; page-break-inside: avoid; }
.box.info { border-color: #0284c7; background: #f0f9ff; }
.box.ok { border-color: #16a34a; background: #f0fdf4; }
code { font-family: Consolas, monospace; background: #f1f5f9; padding: 0 4px; border-radius: 3px; font-size: 9pt; }
.foot { margin-top: 14px; padding-top: 6px; border-top: 1px solid #cbd5e1; color: #64748b; font-size: 8.5pt; }
"""


def render(num: int, m: dict) -> str:
    return f"""<!DOCTYPE html>
<html lang="es"><head><meta charset="utf-8"><title>Manual — {m['title']}</title><style>{CSS}</style></head>
<body>
<div class="head">
  <div class="kicker">Manual de uso · Panel de administración · Sección {num} de {len(MANUALS)}</div>
  <h1>{m['title']}</h1>
  <span class="route">{m['route']}</span>
</div>
<p class="lead">{m['lead']}</p>
{m['body']}
<div class="foot">tiendah2r · Manual del panel de administración · Versión 1.0 — noviembre de 2026. Menú lateral del panel: <b>{m['menu']}</b>.</div>
</body></html>"""


def find_chrome() -> str:
    for c in CHROME_CANDIDATES:
        if pathlib.Path(c).exists():
            return c
    sys.exit("No se encontró Chrome/Edge para generar los PDFs")


def main() -> None:
    HTML_DIR.mkdir(exist_ok=True)
    PDF_DIR.mkdir(exist_ok=True)
    chrome = find_chrome()
    for i, m in enumerate(MANUALS, start=1):
        name = f"{i:02d}-{m['slug']}"
        html = HTML_DIR / f"{name}.html"
        pdf = PDF_DIR / f"{name}.pdf"
        html.write_text(render(i, m), encoding="utf-8")
        subprocess.run(
            [chrome, "--headless=new", "--disable-gpu", "--no-pdf-header-footer",
             f"--print-to-pdf={pdf}", html.as_uri()],
            check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
        )
        print("OK", pdf.name)


if __name__ == "__main__":
    main()
