from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import BreedViewSet, DiseaseViewSet, PetViewSet, MedicationViewSet
from api.views.owner import OwnerRegisterView, OwnerProfileView, OwnerPasswordView
from api.views.auth import LoginView, LogoutView

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medications', MedicationViewSet, basename='medication')

urlpatterns = [
    path('owner/', OwnerRegisterView.as_view(), name='owner_register'),
    path('owner/me/', OwnerProfileView.as_view(), name='owner_profile'),
    path('owner/me/password/', OwnerPasswordView.as_view(), name='owner_password'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('', include(router.urls)),
]
