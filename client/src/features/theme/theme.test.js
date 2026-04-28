import test from 'node:test';
import assert from 'node:assert/strict';
import { applyThemeToDocument, getResolvedTheme } from './theme.js';

test('resolved theme honors explicit light and dark selections', () => {
  assert.equal(getResolvedTheme('light', true), 'light');
  assert.equal(getResolvedTheme('dark', false), 'dark');
});

test('resolved theme uses system preference when requested', () => {
  assert.equal(getResolvedTheme('system', true), 'dark');
  assert.equal(getResolvedTheme('system', false), 'light');
});

test('applyThemeToDocument returns resolved theme without a browser document', () => {
  assert.equal(applyThemeToDocument('system', true), 'dark');
});
