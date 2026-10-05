from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import BreedViewSet, MedicalTestViewSet, PetViewSet

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medical-test', MedicalTestViewSet, basename='medical-test')

urlpatterns = [
    path('', include(router.urls)),
]
