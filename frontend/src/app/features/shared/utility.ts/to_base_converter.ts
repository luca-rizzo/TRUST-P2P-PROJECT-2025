import { BigNumberish, ethers } from "ethers";


export const parseToBase18 = (value: number | string) => ethers.parseUnits(value.toString(), 18);
export const formatBase18 = (value: bigint | BigNumberish) => ethers.formatUnits(value, 18);