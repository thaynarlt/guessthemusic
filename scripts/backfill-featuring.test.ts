import { describe, expect, it } from 'vitest';
import { guestsOf } from '../scripts/backfill-featuring';

const song = (artist: string, title: string) => ({ artist, title });

describe('convidados que valem guardar', () => {
  it('guarda quem o titulo nao denuncia', () => {
    expect(
      guestsOf(song('Major Lazer', 'Sua Cara'), ['Major Lazer', 'Pabllo Vittar', 'Anitta']),
    ).toEqual(['Pabllo Vittar', 'Anitta']);
  });

  it('descarta o artista principal', () => {
    expect(guestsOf(song('Anitta', 'Envolver'), ['Anitta'])).toEqual([]);
  });

  it('descarta quem ja esta no titulo, que a busca ja encontrava', () => {
    expect(
      guestsOf(song('Mark Ronson', 'Uptown Funk (feat. Bruno Mars)'), [
        'Mark Ronson',
        'Bruno Mars',
      ]),
    ).toEqual([]);
  });

  it('ignora acento e caixa ao comparar', () => {
    expect(guestsOf(song('Sofia Marés', 'Tarde'), ['SOFIA MARES', 'Convidado'])).toEqual([
      'Convidado',
    ]);
  });

  it('trata o & do mesmo jeito que a busca', () => {
    // normalize() vira "e": sem isso "Simon & Garfunkel" entraria duplicado.
    expect(guestsOf(song('Simon & Garfunkel', 'Cecilia'), ['Simon e Garfunkel'])).toEqual([]);
  });

  it('nao repete o mesmo convidado', () => {
    expect(guestsOf(song('A', 'B'), ['Anitta', 'anitta', ' Anitta '])).toEqual(['Anitta']);
  });

  it('descarta nomes vazios', () => {
    expect(guestsOf(song('A', 'B'), ['', '   ', 'Valido'])).toEqual(['Valido']);
  });

  it('sem contributors, nao inventa nada', () => {
    expect(guestsOf(song('A', 'B'), [])).toEqual([]);
  });
});
