export type SolidityType = "bytes32" | "int32" | "uint8" | "uint256" | "bytes32[]" | "int32[]" | "uint8[]" | "uint256[]" |"address" | "bool";
export type ValueSchema = { [valueName: string]: SolidityType } | SolidityType;

export interface Tables {
    [tableName: string]: {
        keySchema: { [keyName: string]: SolidityType }
        valueSchema: { [keyName: string]: SolidityType } | SolidityType
    }
}

export type ValueType<T> =
    T extends "bytes32" ? string :
    T extends "uint256" ? bigint :
    T extends "uint8" ? number :
    T extends "int32" ? number :
    any; // Add support for other types as needed

export interface QueryResult {
    staticData: string,
    encodedLengths: string,
    dynamicData: string
}