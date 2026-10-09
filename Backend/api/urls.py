from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import BreedViewSet, DiseaseViewSet, MedicalTestViewSet, MedicationViewSet, PetViewSet

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medical-test', MedicalTestViewSet, basename='medical-test')
router.register(r'medications', MedicationViewSet, basename='medication')

urlpatterns = [
    path('', include(router.urls)),
]
