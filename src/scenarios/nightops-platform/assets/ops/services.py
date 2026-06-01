import bleach
from django.utils.html import strip_tags

_ALLOWED_TAGS  = ['b', 'i', 'em', 'strong', 'ul', 'ol', 'li', 'p', 'br', 'span']
_ALLOWED_ATTRS = {'span': ['class']}


def store_mission_brief(body):
    brief = _normalize_brief(body)
    # ... persist to DB, return new brief ID ...
    return 'placeholder_id'


def list_pending_briefs():
    # ... DB query omitted; returns list of brief dicts ...
    return []


def _normalize_brief(body):
    return {
        'title':         strip_tags(str(body.get('title', ''))),
        'client_handle': strip_tags(str(body.get('client_handle', ''))),
        'location':      strip_tags(str(body.get('location', ''))),
        'payout':        _parse_payout(body.get('payout', 0)),
        'description':   str(body.get('description', '')),
        'tags':          [strip_tags(str(t)) for t in body.get('tags', [])[:8]],
    }


def _parse_payout(value):
    try:
        v = int(value)
        return max(0, min(v, 10_000_000))
    except (TypeError, ValueError):
        return 0
