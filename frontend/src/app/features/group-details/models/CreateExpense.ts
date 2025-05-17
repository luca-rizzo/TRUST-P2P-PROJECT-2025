export enum SplitMethod {
    EQUAL, EXACT, PERCENTAGE
}

export interface CreateExpense {
    description: string,
    amount: number,
    splitMethod: SplitMethod,
    values: number[],
    splitWith: string[]
}