"""Certificate PDF generator.

Renders a branded A4-landscape certificate via reportlab (no system deps).
WeasyPrint is supported when available (better typography), but reportlab is
the default — it ships pure-Python and produces deterministic PDFs ideal for
SHA-256 verification on /verify/<public_id>.
"""

from __future__ import annotations

import hashlib
import io
import secrets
from datetime import UTC, datetime
from typing import Any
from uuid import UUID

from languagepro_common.logging import get_logger

log = get_logger(__name__)


_TEMPLATE = """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8" />
<title>LanguagePro AI Certificate</title>
<style>
  @page {{ size: A4 landscape; margin: 0 }}
  body {{
    font-family: 'Inter', system-ui, sans-serif;
    background: #fff;
    color: #111;
    margin: 0; padding: 0;
  }}
  .frame {{
    box-sizing: border-box;
    margin: 30px;
    padding: 60px 80px;
    border: 4px double #1e3a8a;
    border-radius: 18px;
    height: calc(100vh - 60px);
    display: flex;
    flex-direction: column;
    justify-content: space-between;
  }}
  .brand {{
    font-size: 22px;
    letter-spacing: 0.08em;
    text-transform: uppercase;
    color: #1e3a8a;
    font-weight: 700;
  }}
  h1 {{
    font-size: 56px;
    margin: 16px 0 8px;
    color: #0f172a;
  }}
  .subtitle {{ color: #475569; font-size: 18px; }}
  .name {{
    font-size: 64px;
    font-weight: 800;
    color: #0f172a;
    letter-spacing: -0.02em;
    margin: 28px 0;
    line-height: 1;
  }}
  .meta {{ display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }}
  .meta .cell {{
    border-top: 1px solid #cbd5e1;
    padding-top: 10px;
  }}
  .meta .label {{
    text-transform: uppercase; letter-spacing: .08em;
    color: #64748b; font-size: 11px; font-weight: 600;
  }}
  .meta .value {{
    font-weight: 700; font-size: 22px; color: #0f172a; margin-top: 2px;
  }}
  .verify {{ font-size: 12px; color: #64748b; margin-top: 24px; }}
  .verify code {{ font-family: 'JetBrains Mono', monospace; }}
  .badge {{
    background: linear-gradient(135deg,#1e3a8a,#3b82f6);
    color:#fff; border-radius: 999px; padding: 6px 18px;
    display:inline-block; font-weight:600; font-size:14px;
    letter-spacing:.04em;
  }}
</style>
</head>
<body>
<div class="frame">
  <div>
    <div class="brand">LanguagePro AI · aiexam.uz</div>
    <h1>Certificate of Achievement</h1>
    <div class="subtitle">This certifies that</div>
    <div class="name">{display_name}</div>
    <div class="subtitle">has completed the {exam_name} on {issued_date} achieving:</div>
    <div style="margin-top:18px">
      <span class="badge">IELTS Band {overall_band}</span>
      &nbsp;&nbsp;<span class="badge">CEFR {cefr_level}</span>
    </div>
  </div>
  <div>
    <div class="meta">
      <div class="cell">
        <div class="label">Reading</div>
        <div class="value">{reading}</div>
      </div>
      <div class="cell">
        <div class="label">Listening</div>
        <div class="value">{listening}</div>
      </div>
      <div class="cell">
        <div class="label">Writing</div>
        <div class="value">{writing}</div>
      </div>
      <div class="cell">
        <div class="label">Speaking</div>
        <div class="value">{speaking}</div>
      </div>
    </div>
    <div class="verify">
      Verify at <strong>aiexam.uz/verify/{public_id}</strong>
      &middot; SHA-256 <code>{sha_short}</code>
      &middot; Issued {issued_iso}
    </div>
  </div>
</div>
</body>
</html>
"""


def _gen_public_id() -> str:
    """Short, unambiguous, URL-safe id (Crockford alphabet)."""
    alpha = "ABCDEFGHJKMNPQRSTVWXYZ23456789"
    return "".join(secrets.choice(alpha) for _ in range(10))


def render_certificate_html(*, ctx: dict[str, Any]) -> str:
    return _TEMPLATE.format(**ctx)


def html_to_pdf(html: str) -> bytes:
    """Use WeasyPrint when present, else reportlab. Both produce real A4 PDFs."""
    try:
        from weasyprint import HTML  # type: ignore

        return HTML(string=html).write_pdf()  # type: ignore[no-any-return]
    except Exception:
        pass  # reportlab path below
    return _reportlab_render(_extract_ctx_from_html(html))


def _reportlab_render(ctx: dict[str, Any]) -> bytes:
    """Render a branded A4-landscape certificate using only reportlab primitives."""
    from reportlab.lib.colors import HexColor
    from reportlab.lib.pagesizes import A4, landscape
    from reportlab.pdfbase import pdfmetrics
    from reportlab.pdfgen import canvas

    page_w, page_h = landscape(A4)
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=landscape(A4))

    navy = HexColor("#1e3a8a")
    blue = HexColor("#3b82f6")
    slate_900 = HexColor("#0f172a")
    slate_500 = HexColor("#64748b")
    slate_300 = HexColor("#cbd5e1")

    # Outer double-line frame
    margin = 30
    c.setStrokeColor(navy)
    c.setLineWidth(3)
    c.roundRect(margin, margin, page_w - 2 * margin, page_h - 2 * margin, 18, stroke=1, fill=0)
    c.setLineWidth(1)
    c.roundRect(margin + 6, margin + 6, page_w - 2 * margin - 12, page_h - 2 * margin - 12, 14, stroke=1, fill=0)

    # Brand bar
    c.setFillColor(navy)
    c.setFont("Helvetica-Bold", 12)
    c.drawString(margin + 50, page_h - margin - 50, "LANGUAGEPRO AI · AIEXAM.UZ")

    # Title
    c.setFillColor(slate_900)
    c.setFont("Helvetica-Bold", 36)
    c.drawString(margin + 50, page_h - margin - 100, "Certificate of Achievement")

    c.setFont("Helvetica", 14)
    c.setFillColor(slate_500)
    c.drawString(margin + 50, page_h - margin - 130, "This certifies that")

    # Recipient name
    c.setFont("Helvetica-Bold", 36)
    c.setFillColor(slate_900)
    name = ctx.get("display_name") or ""
    if pdfmetrics.stringWidth(name, "Helvetica-Bold", 36) > page_w - 2 * margin - 100:
        c.setFont("Helvetica-Bold", 28)
    c.drawString(margin + 50, page_h - margin - 180, name)

    # Subtitle line
    c.setFont("Helvetica", 13)
    c.setFillColor(slate_500)
    c.drawString(
        margin + 50,
        page_h - margin - 215,
        f"has completed the {ctx.get('exam_name', '')} on {ctx.get('issued_date', '')} achieving:",
    )

    # Badges
    badge_y = page_h - margin - 260
    _draw_badge(c, margin + 50, badge_y, f"IELTS Band  {ctx.get('overall_band', '-')}")
    _draw_badge(c, margin + 230, badge_y, f"CEFR  {ctx.get('cefr_level', '-')}")
    _ = blue  # reserved for future gradient fill

    # Skill grid (4 cells)
    grid_top = margin + 130
    cell_w = (page_w - 2 * margin - 100) / 4
    skills = [
        ("Reading", ctx.get("reading", "-")),
        ("Listening", ctx.get("listening", "-")),
        ("Writing", ctx.get("writing", "-")),
        ("Speaking", ctx.get("speaking", "-")),
    ]
    for i, (label, val) in enumerate(skills):
        x = margin + 50 + i * cell_w
        c.setStrokeColor(slate_300)
        c.setLineWidth(0.6)
        c.line(x, grid_top + 38, x + cell_w - 10, grid_top + 38)
        c.setFont("Helvetica-Bold", 9)
        c.setFillColor(slate_500)
        c.drawString(x, grid_top + 22, label.upper())
        c.setFont("Helvetica-Bold", 22)
        c.setFillColor(slate_900)
        c.drawString(x, grid_top, str(val))

    # Footer / verify line
    c.setFont("Helvetica", 9)
    c.setFillColor(slate_500)
    verify_text = (
        f"Verify at  aiexam.uz/verify/{ctx.get('public_id', '')}"
        f"   ·   SHA-256  {ctx.get('sha_short', '')}"
        f"   ·   Issued  {ctx.get('issued_iso', '')}"
    )
    c.drawString(margin + 50, margin + 36, verify_text)

    c.showPage()
    c.save()
    return buf.getvalue()


def _draw_badge(c: Any, x: float, y: float, text: str) -> None:
    from reportlab.lib.colors import HexColor

    width = 165
    height = 28
    radius = 14
    c.setFillColor(HexColor("#1e3a8a"))
    c.roundRect(x, y, width, height, radius, stroke=0, fill=1)
    c.setFillColor(HexColor("#ffffff"))
    c.setFont("Helvetica-Bold", 11)
    c.drawCentredString(x + width / 2, y + 9, text)


def _extract_ctx_from_html(html: str) -> dict[str, Any]:
    """Best-effort parse: pull values from the rendered HTML so reportlab
    receives the same data that WeasyPrint would have.

    The HTML is produced by render_certificate_html(ctx=ctx) so the placeholders
    are in known positions; we just regex them back out.
    """
    import re

    fields = {
        "display_name": r'class="name">([^<]+)<',
        "exam_name": r"has completed the ([^o]+?) on ",
        "issued_date": r" on ([^<]+) achieving:",
        "issued_iso": r"Issued ([^<]+)",
        "public_id": r"aiexam\.uz/verify/([A-Z0-9]+)<",
        "overall_band": r"IELTS Band ([0-9.]+)<",
        "cefr_level": r"CEFR ([A-Z0-9]+)<",
        "sha_short": r"SHA-256 <code>([a-f0-9]+)</code>",
    }
    out: dict[str, Any] = {}
    for k, pat in fields.items():
        m = re.search(pat, html)
        if m:
            out[k] = m.group(1).strip()
    # Skill cells (4 per-skill blocks)
    for skill in ("reading", "listening", "writing", "speaking"):
        m = re.search(
            rf'class="label">{skill.capitalize()}</div>\s*<div class="value">([^<]+)<',
            html,
        )
        if m:
            out[skill] = m.group(1).strip()
    return out


def issue(
    *,
    user_id: UUID,
    attempt_id: UUID,
    display_name: str,
    overall_band: float,
    cefr_level: str,
    bands: dict[str, float],
    exam_name: str,
) -> dict[str, Any]:
    public_id = _gen_public_id()
    now = datetime.now(UTC)
    ctx = {
        "display_name": display_name,
        "exam_name": exam_name,
        "issued_date": now.strftime("%d %B %Y"),
        "issued_iso": now.isoformat(timespec="seconds"),
        "public_id": public_id,
        "overall_band": f"{overall_band:.1f}",
        "cefr_level": cefr_level,
        "reading": _band(bands.get("reading")),
        "listening": _band(bands.get("listening")),
        "writing": _band(bands.get("writing")),
        "speaking": _band(bands.get("speaking")),
        "sha_short": "",
    }
    pdf = html_to_pdf(render_certificate_html(ctx=ctx))
    sha = hashlib.sha256(pdf).hexdigest()
    # Re-render with the real hash so it appears on the printed page itself.
    ctx["sha_short"] = sha[:16]
    pdf = html_to_pdf(render_certificate_html(ctx=ctx))
    sha_final = hashlib.sha256(pdf).hexdigest()

    return {
        "public_id": public_id,
        "sha256": sha_final,
        "pdf_bytes": pdf,
        "issued_at": now,
        "payload": {
            "exam_name": exam_name,
            "display_name": display_name,
            "overall_band": overall_band,
            "cefr_level": cefr_level,
            "bands": bands,
        },
    }


def _band(v: float | None) -> str:
    return f"{v:.1f}" if v is not None else "—"


# Re-exported for tests/typing convenience
def _band_to_cefr_helper(band: float) -> str:
    if band >= 8.5:
        return "C2"
    if band >= 7.0:
        return "C1"
    if band >= 5.5:
        return "B2"
    if band >= 4.0:
        return "B1"
    if band >= 3.0:
        return "A2"
    return "A1"
