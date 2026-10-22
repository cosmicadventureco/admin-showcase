"""Inline the showcase into one HTML file (for a single-file preview or email)."""
import re, sys, pathlib
pub = pathlib.Path(__file__).parent / 'public'
html = (pub / 'index.html').read_text()
css = (pub / 'app.css').read_text()
js = ''.join((pub / f).read_text() + '\n' for f in ['data.js', 'app.js', 'automations.js', 'client.js', 'queue.js', 'scans.js', 'outcome.js', 'protocols.js', 'portal.js', 'forms.js', 'calendar.js', 'packages.js', 'tour.js'])
html = re.sub(r'<!--STYLE-->.*?<!--/STYLE-->', lambda m: '<style>\n' + css + '</style>', html, flags=re.S)
html = re.sub(r'<!--SCRIPTS-->.*?<!--/SCRIPTS-->', lambda m: '<script>\n' + js + '</script>', html, flags=re.S)
if '--fragment' in sys.argv:  # the claude.ai artifact host adds its own document skeleton
    html = re.sub(r'<!DOCTYPE html>\s*<html[^>]*>\s*<head>', '', html)
    html = re.sub(r'<meta charset="utf-8">\s*<meta name="viewport"[^>]*>\s*', '', html)
    html = html.replace('</head>', '').replace('<body>', '').replace('</body>', '').replace('</html>', '')
out = pathlib.Path(sys.argv[1])
out.write_text(html)
print(out, len(html))
