import json
import logging

from django.contrib.auth.decorators import login_required
from django.core.cache import cache
from django.http import JsonResponse
from django.shortcuts import render
from django.views.decorators.http import require_http_methods
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny, IsAuthenticated

from .services import store_mission_brief, list_pending_briefs
from .contracts import render_contract_preview

logger = logging.getLogger('nightops.api')

_RATE_WINDOW = 60
_RATE_LIMIT  = 15


def _client_ip(request):
    xff = request.META.get('HTTP_X_FORWARDED_FOR', '')
    return xff.split(',')[0].strip() or request.META.get('REMOTE_ADDR', '')


def _rate_check(ns, request):
    key  = f'rl:{ns}:{_client_ip(request)}'
    hits = cache.get(key, 0)
    if hits >= _RATE_LIMIT:
        return False
    cache.set(key, hits + 1, _RATE_WINDOW)
    return True


@api_view(['POST'])
@permission_classes([AllowAny])
def mission_brief_submit(request):
    """Accept a new mission brief from a client."""
    if not _rate_check('brief', request):
        return JsonResponse({'error': 'Too many requests'}, status=429)

    try:
        body = json.loads(request.body)
    except (json.JSONDecodeError, UnicodeDecodeError):
        return JsonResponse({'error': 'Invalid payload'}, status=400)

    brief_id = store_mission_brief(body)
    logger.info('brief.submitted id=%s ip=%s', brief_id, _client_ip(request))
    return JsonResponse({'status': 'received', 'id': brief_id}, status=201)


@login_required
@require_http_methods(['GET'])
def ops_dashboard(request):
    """Render the operator dashboard with pending mission briefs."""
    briefs = list_pending_briefs()
    return render(request, 'ops/dashboard.html', {'briefs': briefs})


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def contract_preview(request):
    """Generate a formatted contract preview."""
    body          = request.data
    template_name = body.get('template', 'standard_op')
    context       = body.get('context', {})
    addendum      = body.get('addendum', '')

    if template_name not in ('standard_op', 'covert_op', 'extraction'):
        return JsonResponse({'error': 'Unknown template'}, status=400)

    preview = render_contract_preview(template_name, context, addendum, request)
    return JsonResponse({'preview': preview})
