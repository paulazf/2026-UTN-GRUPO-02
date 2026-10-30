from datetime import timedelta
from django.utils import timezone
from rest_framework import status
from rest_framework.exceptions import NotFound, ValidationError
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from api.models import (
    Appointment,
    MedicationPet,
    VaccinePet,
)
from api.serializers.medical_test import active_pets


class CalendarEventsView(APIView):
    """
    Vista agregadora de eventos sanitarios de mascotas (TDD-0043).
    Consolida de forma cronológica eventos provenientes de:
    - Turnos (Appointment)
    - Vacunas y antiparasitarios (VaccinePet)
    - Tratamientos activos de medicación (MedicationPet)
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        if not hasattr(request.user, "owner_profile"):
            return Response([], status=status.HTTP_200_OK)

        pets = active_pets(request)

        # Filtro opcional por idPet
        id_pet_param = request.query_params.get("idPet")
        if id_pet_param is not None:
            if not str(id_pet_param).isdigit():
                raise ValidationError({"idPet": ["Debe ser un número entero."]})
            pet_id = int(id_pet_param)
            if not pets.filter(pk=pet_id).exists():
                raise NotFound("Mascota no encontrada.")
            pets = pets.filter(pk=pet_id)

        # Filtro opcional por entityType
        entity_type_param = request.query_params.get("entityType")
        if entity_type_param:
            entity_type_param = entity_type_param.strip().upper()

        # Filtros de fecha opcionales
        from_date_param = request.query_params.get("fromDate")
        to_date_param = request.query_params.get("toDate")

        today = timezone.localdate()
        events = []

        # -------------------------------------------------------------
        # 1. Turnos veterinarios (Appointment)
        # -------------------------------------------------------------
        if not entity_type_param or entity_type_param == "APPOINTMENT":
            appointments = Appointment.objects.select_related("pet").filter(
                isDeleted=False,
                pet__in=pets,
            )
            for app in appointments:
                app_date = app.date
                days_rem = (app_date - today).days
                time_str = app.time.strftime("%H:%M")

                title = (
                    f"Turno: {app.description.strip()}"
                    if app.description
                    else f"Turno con {app.veterinarian}"
                )
                subtitle = (
                    f"{app.pet.name} · {app.veterinarian} · {time_str}hs"
                    if app.veterinarian
                    else f"{app.pet.name} · {time_str}hs"
                )

                events.append({
                    "id": f"appointment-{app.idAppointment}",
                    "entityType": "APPOINTMENT",
                    "title": title,
                    "subtitle": subtitle,
                    "date": app_date.isoformat(),
                    "time": time_str,
                    "petId": app.pet_id,
                    "petName": app.pet.name,
                    "daysRemaining": days_rem,
                    "isExpired": app_date < today,
                    "hasVaccineExpirationInMonth": False,
                    "sourceId": app.idAppointment,
                })

        # -------------------------------------------------------------
        # 2. Vacunas y antiparasitarios (VaccinePet)
        # -------------------------------------------------------------
        if not entity_type_param or entity_type_param == "VACCINE":
            # Ordenamos por applicationDate descendente (y por id desc) para evaluar la última aplicación
            vaccine_pets = (
                VaccinePet.objects.select_related("pet", "vaccine")
                .filter(isDeleted=False, pet__in=pets)
                .order_by("-applicationDate", "-idVaccinePet")
            )

            # Nos quedamos exclusivamente con la última aplicación registrada para cada (pet, vaccine)
            latest_by_vaccine = {}
            for vp in vaccine_pets:
                key = (vp.pet_id, vp.vaccine_id)
                if key not in latest_by_vaccine:
                    latest_by_vaccine[key] = vp

            # Evaluamos la última aplicación de cada vacuna
            for vp in latest_by_vaccine.values():
                # Si no tiene fecha de expiración, no genera evento de vencimiento
                if not vp.expirationDate:
                    continue

                exp_date = vp.expirationDate
                days_rem = (exp_date - today).days

                if exp_date < today:
                    # Última aplicación vencida -> sección Vencidas
                    events.append({
                        "id": f"vaccine-{vp.idVaccinePet}-exp",
                        "entityType": "VACCINE",
                        "title": vp.vaccine.name,
                        "subtitle": f"{vp.pet.name} · Vencimiento",
                        "date": exp_date.isoformat(),
                        "time": None,
                        "petId": vp.pet_id,
                        "petName": vp.pet.name,
                        "daysRemaining": days_rem,
                        "isExpired": True,
                        "hasVaccineExpirationInMonth": False,
                        "sourceId": vp.idVaccinePet,
                    })
                else:
                    # Última aplicación vigente -> sección Por Mes
                    events.append({
                        "id": f"vaccine-{vp.idVaccinePet}-exp",
                        "entityType": "VACCINE",
                        "title": vp.vaccine.name,
                        "subtitle": f"{vp.pet.name} · Vencimiento",
                        "date": exp_date.isoformat(),
                        "time": None,
                        "petId": vp.pet_id,
                        "petName": vp.pet.name,
                        "daysRemaining": days_rem,
                        "isExpired": False,
                        "hasVaccineExpirationInMonth": True,
                        "sourceId": vp.idVaccinePet,
                    })

        # -------------------------------------------------------------
        # 3. Medicaciones activas (MedicationPet)
        # -------------------------------------------------------------
        if not entity_type_param or entity_type_param == "MEDICATION":
            medications = MedicationPet.objects.select_related("pet", "medication").filter(
                isDeleted=False,
                pet__in=pets,
            )
            for med in medications:
                start_date = med.startDate
                end_date = med.endDate

                # Sin cálculos de dosis/frecuencia: aparece todos los días entre startDate y endDate
                curr = start_date
                while curr <= end_date:
                    days_rem = (curr - today).days
                    events.append({
                        "id": f"medication-{med.id}-{curr.isoformat()}",
                        "entityType": "MEDICATION",
                        "title": med.medication.name,
                        "subtitle": f"{med.pet.name} · Medicación",
                        "date": curr.isoformat(),
                        "time": None,
                        "petId": med.pet_id,
                        "petName": med.pet.name,
                        "daysRemaining": days_rem,
                        "isExpired": curr < today,
                        "hasVaccineExpirationInMonth": False,
                        "sourceId": med.id,
                    })
                    curr += timedelta(days=1)

        # -------------------------------------------------------------
        # 5. Filtrado por rango de fechas (fromDate / toDate)
        # -------------------------------------------------------------
        if from_date_param:
            events = [e for e in events if e["date"] >= from_date_param]
        if to_date_param:
            events = [e for e in events if e["date"] <= to_date_param]

        # -------------------------------------------------------------
        # 6. Ordenamiento cronológico por date y time
        # -------------------------------------------------------------
        events.sort(key=lambda e: (e["date"], e["time"] or "00:00", e["id"]))

        return Response(events, status=status.HTTP_200_OK)
