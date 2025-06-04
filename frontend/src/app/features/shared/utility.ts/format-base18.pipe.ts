import { Pipe, PipeTransform } from '@angular/core';
import { formatBase18 } from './to_base_converter';
import { BigNumberish } from 'ethers';

@Pipe({
  name: 'formatBase18',
  standalone: true
})
export class FormatBase18Pipe implements PipeTransform {

transform(value: bigint | BigNumberish, symbol: string = '€'): string {
  if (value == null) return '';
  try {
    const number = Number(formatBase18(value));
    const formatted = new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 3
    }).format(number);
    return `${formatted} ${symbol}`;
  } catch {
    return '';
  }
}

}
