import { describe, expect, it } from 'vitest';
import { formatPlayerName, formatPlayerNameFull } from './naming';

describe('naming', () => {
  it('formatPlayerNameFull shows the full name for normal players', () => {
    expect(formatPlayerNameFull({ firstName: 'Diego', lastName: 'Tardelli' })).toBe('Diego Tardelli');
  });

  it('formatPlayerNameFull collapses a duplicated mononym to a single word', () => {
    expect(formatPlayerNameFull({ firstName: 'Danilo', lastName: 'Danilo' })).toBe('Danilo');
    expect(formatPlayerNameFull({ firstName: 'Pelé', lastName: 'Pelé' })).toBe('Pelé');
  });

  it('formatPlayerNameFull falls back to firstName when lastName is empty', () => {
    expect(formatPlayerNameFull({ firstName: 'Tchê Tchê', lastName: '' })).toBe('Tchê Tchê');
  });

  it('formatPlayerName (abreviado, só pro campinho) initials the first name', () => {
    expect(formatPlayerName({ firstName: 'Diego', lastName: 'Tardelli' })).toBe('D. Tardelli');
  });

  it('formatPlayerName also collapses mononyms without adding a stray initial', () => {
    expect(formatPlayerName({ firstName: 'Danilo', lastName: 'Danilo' })).toBe('Danilo');
  });
});
