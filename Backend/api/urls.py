from django.urls import include, path
from rest_framework.routers import DefaultRouter

from api.views import (
    BreedViewSet,
    DiseaseViewSet,
    PetViewSet,
    MedicationViewSet,
    PetDiseaseViewSet,
    MedicalTestViewSet,
    MedicationPetViewSet,
    VaccineViewSet,
    VaccinePetViewSet,
    ProvinceViewSet,
    CityViewSet,
    AddressViewSet,
    AppointmentViewSet,
    FeedingViewSet,
)
from api.views.owner import OwnerRegisterView, OwnerProfileView, OwnerPasswordView
from api.views.auth import LoginView, LogoutView

router = DefaultRouter()
router.register(r'breeds', BreedViewSet, basename='breed')
router.register(r'diseases', DiseaseViewSet, basename='disease')
router.register(r'pets', PetViewSet, basename='pet')
router.register(r'medical-test', MedicalTestViewSet, basename='medical-test')
router.register(r'medication-pets', MedicationPetViewSet, basename='medication-pet')
router.register(r'medications', MedicationViewSet, basename='medication')
router.register(r'pet-diseases', PetDiseaseViewSet, basename='pet-disease')
router.register(r'vaccines', VaccineViewSet, basename='vaccine')
router.register(r'vaccine-pets', VaccinePetViewSet, basename='vaccine-pet')
router.register(r'provinces', ProvinceViewSet, basename='province')
router.register(r'cities', CityViewSet, basename='city')
router.register(r'addresses', AddressViewSet, basename='address')
router.register(r'appointments', AppointmentViewSet, basename='appointment')
router.register(r'feedings', FeedingViewSet, basename='feeding')

urlpatterns = [
    path('owner/', OwnerRegisterView.as_view(), name='owner_register'),
    path('owner/me/', OwnerProfileView.as_view(), name='owner_profile'),
    path('owner/me/password/', OwnerPasswordView.as_view(), name='owner_password'),
    path('auth/login/', LoginView.as_view(), name='auth_login'),
    path('auth/logout/', LogoutView.as_view(), name='auth_logout'),
    path('', include(router.urls)),
]