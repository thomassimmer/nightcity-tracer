from django.urls import path
from . import views

app_name = 'ops'

urlpatterns = [
    path('briefs/',                views.mission_brief_submit, name='brief-submit'),
    path('dashboard/',             views.ops_dashboard,        name='dashboard'),
    path('api/contracts/preview/', views.contract_preview,     name='contract-preview'),
]
