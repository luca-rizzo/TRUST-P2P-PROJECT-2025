import { BaseContract } from 'ethers';
import { fromEventPattern, Observable } from 'rxjs';
import { map, filter } from 'rxjs/operators';

/**
 * Crea uno stream osservabile tipizzato per un evento del contratto,
 * assegnando i parametri agli attributi tramite i nomi forniti.
 *
 * @param eventName Nome dell'evento Solidity
 * @param contract Contratto ethers.js
 * @param fieldNames Array dei nomi dei campi in ordine
 * @param filterFn Funzione di filtro opzionale sul tipo T
 * @returns Observable<T> emesso ogni volta che l'evento viene emesso
 */
export const createObservableFromEvent = <T>(
  eventName: string,
  contract: BaseContract,
  fieldNames: (keyof T)[],
  filterFn?: (data: T) => boolean
): Observable<T> => {
  return fromEventPattern<any[]>(
    handler => contract.on(eventName, handler),
    handler => contract.off(eventName, handler)
  ).pipe(
    map((args): T => {
      const result = {} as T;
      fieldNames.forEach((key, index) => {
        result[key] = args[index];
      });
      return result;
    }),
    filter((event: T) => (filterFn ? filterFn(event) : true))
  );
};
