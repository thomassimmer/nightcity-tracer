import os
from datetime import timedelta
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get('DJANGO_SECRET_KEY', 'nightops-dev-insecure-key-change-in-prod')
DEBUG = False

ALLOWED_HOSTS = ['nightops.internal', '10.0.0.5', '10.0.0.3']

INSTALLED_APPS = [
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.staticfiles',
    'rest_framework',
    'rest_framework_simplejwt',
    'ops',
]

MIDDLEWARE = [
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'ops.middleware.AuditMiddleware',
]

TEMPLATES = [
    {
        'BACKEND': 'django.template.backends.django.DjangoTemplates',
        'DIRS': [BASE_DIR / 'templates'],
        'APP_DIRS': True,
        'OPTIONS': {
            'context_processors': [
                'django.template.context_processors.request',
                'django.contrib.auth.context_processors.auth',
            ],
        },
    }
]

REST_FRAMEWORK = {
    'DEFAULT_AUTHENTICATION_CLASSES': [
        'rest_framework_simplejwt.authentication.JWTAuthentication',
    ],
    'DEFAULT_PERMISSION_CLASSES': [
        'rest_framework.permissions.IsAuthenticated',
    ],
}

SIMPLE_JWT = {
    'ACCESS_TOKEN_LIFETIME': timedelta(hours=8),
    'ALGORITHM': 'HS256',
    'SIGNING_KEY': SECRET_KEY,
}

DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.postgresql',
        'NAME': os.environ.get('DB_NAME', 'nightops_db'),
        'USER': os.environ.get('DB_USER', 'nightops_app'),
        'PASSWORD': os.environ.get('DB_PASS', ''),
        'HOST': '127.0.0.1',
        'PORT': '5432',
    }
}

CACHES = {
    'default': {
        'BACKEND': 'django.core.cache.backends.redis.RedisCache',
        'LOCATION': os.environ.get('REDIS_URL', 'redis://127.0.0.1:6379/0'),
    }
}

SESSION_COOKIE_HTTPONLY = True
SESSION_COOKIE_SECURE   = True
SESSION_COOKIE_SAMESITE = 'Strict'

STATIC_URL  = '/static/'
STATIC_ROOT = BASE_DIR / 'staticfiles'
