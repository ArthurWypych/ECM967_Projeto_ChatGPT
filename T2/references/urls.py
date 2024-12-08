from django.urls import path
from .views import ReferenceAPIView

urlpatterns = [
    path('format/', ReferenceAPIView.as_view(), name='format-reference'),
]