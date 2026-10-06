from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import BreedViewSet, PetViewSet, MedicationViewSet

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medications', MedicationViewSet, basename='medication')

urlpatterns = [
    path('', include(router.urls)),
]
