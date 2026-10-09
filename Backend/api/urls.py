from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import BreedViewSet, DiseaseViewSet, PetViewSet, MedicationViewSet, PetDiseaseViewSet

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medications', MedicationViewSet, basename='medication')
router.register(r'pet-diseases', PetDiseaseViewSet, basename='pet-disease')

urlpatterns = [
    path('', include(router.urls)),
]
