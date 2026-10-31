import axiosClient from '../api/axiosClient';
import { CalendarEvent, CalendarFilterParams } from '../types/calendar';

/**
 * Consulta la lista agregada y cronológica de eventos del calendario (TDD-0043).
 * GET /api/v1/calendar/events/
 */
export async function fetchCalendarEvents(params?: CalendarFilterParams): Promise<CalendarEvent[]> {
  try {
    const response = await axiosClient.get<CalendarEvent[]>('/calendar/events/', {
      params,
    });
    return response.data;
  } catch (error) {
    console.error('Error al obtener eventos de calendario:', error);
    throw error;
  }
}