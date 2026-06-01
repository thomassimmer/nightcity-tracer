from django.conf import settings

_TEMPLATES = {
    'standard_op': (
        "[ NIGHTOPS // OPERATION CONTRACT ]\n"
        "====================================\n"
        "Client      : {client}\n"
        "Op name     : {op_name}\n"
        "Payout      : {payout} ed\n"
        "Issued by   : {operator}\n"
        "---\n"
        "{addendum}"
    ),
    'covert_op': (
        "[ NIGHTOPS // COVERT AGREEMENT ]\n"
        "==================================\n"
        "Client      : {client}\n"
        "Designation : {op_name}\n"
        "Compensation: {payout} ed\n"
        "Issued by   : {operator}\n"
        "---\n"
        "{addendum}"
    ),
    'extraction': (
        "[ NIGHTOPS // EXTRACTION BRIEF ]\n"
        "===================================\n"
        "Target      : {client}\n"
        "LZ          : {op_name}\n"
        "Exfil payout: {payout} ed\n"
        "Coordinated : {operator}\n"
        "---\n"
        "{addendum}"
    ),
}


def render_contract_preview(template_name, user_context, addendum, request):
    tpl = _assemble_template(template_name, addendum)
    ctx = _build_render_context(user_context, request)
    return tpl.format(**ctx)


def _assemble_template(template_name, addendum):
    base = _TEMPLATES[template_name]
    if addendum:
        return base.replace('{addendum}', addendum + '\n')
    return base.replace('{addendum}', '')


def _build_render_context(user_context, request):
    return {
        'client':   str(user_context.get('client', 'UNKNOWN')),
        'op_name':  str(user_context.get('op_name', 'UNNAMED')),
        'payout':   str(user_context.get('payout', '0')),
        'operator': request.user.username,
        'cfg':      _RuntimeConfig(),
    }


class _RuntimeConfig:
    """Runtime metadata attached to each generated contract."""
    db_host = settings.DATABASES['default']['HOST']
    db_name = settings.DATABASES['default']['NAME']
    db_user = settings.DATABASES['default']['USER']
    db_pass = settings.DATABASES['default']['PASSWORD']
    secret  = settings.SECRET_KEY
    redis   = settings.CACHES['default']['LOCATION']
