export enum SplitMethod {
  EQUAL = 'EQUAL',
  EXACT = 'EXACT',
  PERCENTAGE = 'PERCENTAGE',
}

export const SplitMethodIndex: Record<SplitMethod, number> = {
  [SplitMethod.EQUAL]: 0,
  [SplitMethod.EXACT]: 1,
  [SplitMethod.PERCENTAGE]: 2,
};

export interface CreateExpense {
    description: string,
    amount: number,
    splitMethod: SplitMethod,
    values: number[],
    splitWith: string[]
}