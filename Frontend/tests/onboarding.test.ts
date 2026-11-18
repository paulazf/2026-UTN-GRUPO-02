import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  ONBOARDING_SLIDES,
  ONBOARDING_SEEN_KEY,
} from '../src/services/onboardingService.ts';

test('HU-308: Escenario 1 - El tutorial cuenta con exactamente 3 pantallas temáticas', () => {
  assert.equal(ONBOARDING_SLIDES.length, 3, 'Debe haber exactamente 3 diapositivas explicativas');

  const [slide1, slide2, slide3] = ONBOARDING_SLIDES;

  // Diapositiva 1: Libreta
  assert.equal(slide1.id, 'libreta');
  assert.match(slide1.title.toLowerCase(), /libreta/);
  assert.ok(slide1.description.length > 20, 'La descripción de la libreta debe ser clara');

  // Diapositiva 2: Avisos
  assert.equal(slide2.id, 'avisos');
  assert.match(slide2.title.toLowerCase(), /avisos|recordatorios/);
  assert.ok(slide2.description.length > 20, 'La descripción de avisos debe ser clara');

  // Diapositiva 3: Compartir con el veterinario
  assert.equal(slide3.id, 'compartir');
  assert.match(slide3.title.toLowerCase(), /compart/);
  assert.ok(slide3.description.length > 20, 'La descripción de compartir debe ser clara');
});

test('HU-308: Clave de almacenamiento SecureStore única y consistente', () => {
  assert.equal(ONBOARDING_SEEN_KEY, '@petlife_has_seen_onboarding');
});

test('HU-308: Cada diapositiva posee ícono principal y etiqueta informativa', () => {
  for (const slide of ONBOARDING_SLIDES) {
    assert.ok(slide.icon.endsWith('-outline'), 'Debe utilizar íconos consistentes de Ionicons');
    assert.ok(slide.tag.length > 3, 'Debe tener una etiqueta de resumen');
  }
});
