export type SolidityType = "bytes32" | "int32" | "uint8" | "uint256" | "bytes32[]" | "int32[]" | "uint8[]" | "uint256[]" |"address" | "bool";
export type ValueSchema = { [valueName: string]: SolidityType } | SolidityType;

export interface Tables {
    [tableName: string]: {
        keySchema: { [keyName: string]: SolidityType }
        valueSchema: { [keyName: string]: SolidityType } | SolidityType
    }
}

export interface QueryResult {
    staticData: string,
    encodedLengths: string,
    dynamicData: string
}