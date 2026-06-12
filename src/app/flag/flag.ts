import { Component, computed, input, signal } from '@angular/core';
import { flagCode } from '../data/flags';

function norm(s: string): string {
  return (s ?? '')
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .trim()
    .toLowerCase();
}

/** Small inline country flag for a team name. Renders as a fixed-width tile so
 *  names line up in lists. Turkey is shown as its flag rotated 180° / upside
 *  down (by request); unknown teams (e.g. "Draw" or an unset knockout slot)
 *  render nothing. */
@Component({
  selector: 'app-flag',
  imports: [],
  template: `
    @if (isTurkey()) {
      <img
        class="flag-icon flag-img upside-down"
        src="https://flagcdn.com/tr.svg"
        [alt]="team()"
        title="Turkey"
        loading="lazy"
      />
    } @else if (code() && !failed()) {
      <img
        class="flag-icon flag-img"
        [src]="'https://flagcdn.com/' + code() + '.svg'"
        [alt]="team()"
        loading="lazy"
        (error)="failed.set(true)"
      />
    }
  `,
  styles: `
    .flag-icon {
      display: inline-block;
      width: 1.3em;
      vertical-align: -2px;
      flex: 0 0 auto;
    }
    .flag-img {
      height: 0.9em;
      object-fit: cover;
      border-radius: 2px;
      box-shadow: 0 0 0 0.5px rgba(0, 0, 0, 0.2);
    }
    .upside-down {
      transform: rotate(180deg);
    }
  `,
})
export class Flag {
  readonly team = input<string>('');
  protected readonly failed = signal(false);
  protected readonly code = computed(() => flagCode(this.team()));
  protected readonly isTurkey = computed(() => {
    const t = norm(this.team());
    return t === 'turkey' || t === 'turkiye';
  });
}
