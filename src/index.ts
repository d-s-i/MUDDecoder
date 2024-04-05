import { remove0x } from "./utils";

import { ValueSchema, SolidityType, Tables, QueryResult } from "../types";

enum ValueSchemaType {
    StaticOnly,
    DynamicOnly,
    StaticAndDynamic
}

export class MUDDecoder {

    private _BYTE_CHARS_LENGTH = 2;

    private _tables: Tables;

    constructor(tables: Tables) {
        this._tables = tables;
    }

    decodeData(res: QueryResult, tableName: string) {
        if(!this.tables[tableName]) throw new Error(`MUDDecoder::decodeData - Not table found with this tableName (tableName: ${tableName})`);
        
        const valueSchemaType = this.getValueSchemaType(this.tables[tableName].valueSchema);
        if(valueSchemaType === ValueSchemaType.StaticOnly) return this.decodeStaticData(res.staticData, this.tables[tableName].valueSchema);
        if(valueSchemaType === ValueSchemaType.DynamicOnly) return this.decodeDynamicData(res, this.tables[tableName].valueSchema);

        const staticValueSchema = this._getStaticSchema(this.tables[tableName].valueSchema);
        const dynamicValueSchema = this._getDynamicSchema(this.tables[tableName].valueSchema);

        const staticRes = this.decodeStaticData(res.staticData, staticValueSchema);
        const dynamicRes = this.decodeDynamicData(res, dynamicValueSchema);
        return {
            ...staticRes,
            ...dynamicRes
        };
    }

    getValueSchemaType(valueSchema: ValueSchema) {
        const isSimpleType = typeof(valueSchema) === "string";
        if(isSimpleType) {
            if(!this.isDynamicType(valueSchema)) return ValueSchemaType.StaticOnly;
            if(this.isDynamicType(valueSchema)) return ValueSchemaType.DynamicOnly;
        }

        let hasDynamicData = false;
        let hasStaticData = false;
        for(const valueType of Object.values(valueSchema) as SolidityType[]) {
            if(this.isDynamicType(valueType)) hasDynamicData = true;
            if(!this.isDynamicType(valueType)) hasStaticData = true;
        }

        if(hasDynamicData && hasStaticData) return ValueSchemaType.StaticAndDynamic;
        else if(hasStaticData && !hasDynamicData) return ValueSchemaType.StaticOnly;
        else if(hasDynamicData && !hasStaticData) return ValueSchemaType.DynamicOnly;
        else throw new Error(`MUDDecoder::getValueSchemaType - valueSchema has neither static or dynamic type, impossible case.`);
    }

    isDynamicType(type: SolidityType) {
        return type.includes("[]");
    }

    decodeStaticData(staticData: string, valueSchema: ValueSchema): any {

        if(typeof(valueSchema) === "string") {
            return this._parseType(valueSchema as SolidityType, remove0x(staticData));
        }

        const _staticData = remove0x(staticData);
        const decodedValue: { [itemName: string]: any } = {};
        let cursor = 0;
        for(const [valueName, valueType] of Object.entries(valueSchema) as [string, SolidityType][]) {
            const length = this.getTypeLengthInBytes(valueType) * this.BYTE_CHARS_LENGTH;
            const end = cursor + length;
            const value = _staticData.slice(cursor, end);
            decodedValue[valueName] = this._parseType(valueType, value);
    
            cursor = end
        }

        return decodedValue;
    }

    getTypeLengthInBytes(typeName: SolidityType) {
        const _typeName = this.isDynamicType(typeName) ? this._removeBracketsStr(typeName) : typeName;
        if(_typeName === "bytes32") return 32;
        if(_typeName === "uint8") return 1;
        if(_typeName === "uint256") return 32;
        if(_typeName === "int32") return 4;
        throw new Error(`MUDDecoder::getTypeLengthInBytes - No length found for type (type: ${typeName})`);
    }

    decodeDynamicData(
        { encodedLengths, dynamicData }: { encodedLengths: string, dynamicData: string },
        valueSchema: ValueSchema
    ): any {
        const { bytesLengths } = this.getBytesLengths(encodedLengths);
        const decodedValues = this._decodeDynamicData(dynamicData, bytesLengths, valueSchema);
        return decodedValues;
    }

    getBytesLengths(encodedBytesLengths: string) {
        const rawBytesLengthsStr = remove0x(encodedBytesLengths);
    
        const fifthBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(0, 10)}`).toString();
        const fourthBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(10, 20)}`).toString();
        const thirdBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(20, 30)}`).toString();
        const secondBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(30, 40)}`).toString();
        const firstBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(40, 50)}`).toString();
        const totalBytesLength = +BigInt(`0x${rawBytesLengthsStr.slice(50)}`).toString();
    
        return { bytesLengths: [
            firstBytesLength,
            secondBytesLength,
            thirdBytesLength,
            fourthBytesLength,
            fifthBytesLength
        ], total: totalBytesLength };
    }
    
    _decodeDynamicData(dynamicData: string, byteLengthsForArrays: number[], valueSchema: ValueSchema) {
        const arraysOfStringValues = this._extractDataArrays(dynamicData, byteLengthsForArrays);
        const dataInfos = { arraysOfStringValues, byteLengthsForArrays };
        const decodedData = this._decodeArraysIntoValues(dataInfos, valueSchema);
        
        return decodedData;
    }

    _extractDataArrays(dynamicData: string, bytesArrayLengths: number[]) {
        
        const _dynamicData = remove0x(dynamicData); 

        let cursor = 0;
        const arrays: string[] = [];
        for(const length of bytesArrayLengths) {
            const end = cursor + (this.BYTE_CHARS_LENGTH * length);
            arrays.push(_dynamicData.slice(cursor, end));
            cursor = end;
        }

        return arrays;
    }

    _decodeArraysIntoValues<T extends ValueSchema>(
        { arraysOfStringValues, byteLengthsForArrays }: { arraysOfStringValues: string[], byteLengthsForArrays: number[] },
        valueSchema: T
    ) {

        if(typeof(valueSchema) === "string") {
            const itemCharsLength = this.getTypeLengthInBytes(valueSchema) * this.BYTE_CHARS_LENGTH;

            let itemValues;
            for(let i = 0; i < arraysOfStringValues.length; i += itemCharsLength) {
                const data = arraysOfStringValues[i];
                const cursorValue = { dataCursor: 0, dataEnd: byteLengthsForArrays[i] * this.BYTE_CHARS_LENGTH, itemCharsLength };
                itemValues = this._sliceValuesIntoArr(data, cursorValue);
            }

            return itemValues;
        }

        const valueSchemaValues = Object.values(valueSchema) as SolidityType[];
        const organisedValues: { [valueName: string]: any[] } = {};
        for(let i = 0; i < valueSchemaValues.length; i++) {
            
            const itemCharsLength = this.getTypeLengthInBytes(valueSchemaValues[i]) * this.BYTE_CHARS_LENGTH;
            
            const data = arraysOfStringValues[i];
            const cursorValue = { dataCursor: 0, dataEnd: byteLengthsForArrays[i] * this.BYTE_CHARS_LENGTH, itemCharsLength };
            const itemValues = this._sliceValuesIntoArr(data, cursorValue);

            const valueName = Object.keys(valueSchema)[i];
            organisedValues[valueName] = itemValues.map(val => this._parseType(valueSchemaValues[i], val));
        }

        return organisedValues;
        
    }

    _sliceValuesIntoArr(data: string, { dataCursor, dataEnd, itemCharsLength }: { dataCursor: number, dataEnd: number, itemCharsLength: number }) {
        const itemValues: string[] = [];
        while(dataCursor < dataEnd) {
            const valueEnd = dataCursor + itemCharsLength;
            const value = data.slice(dataCursor, valueEnd);
            itemValues.push(value);
            dataCursor = valueEnd;
        }

        return itemValues;
    }
    
    _parseType<T extends SolidityType>(typeName: T, value: string) {
        const _typeName = this.isDynamicType(typeName) ? this._removeBracketsStr(typeName) : typeName;
        if(_typeName === "bytes32") return `0x${value}`;
        if(
            _typeName === "uint8" ||
            _typeName === "int32"
        ) return +BigInt(`0x${value}`).toString();
        if(_typeName === "uint256") return BigInt(`0x${value}`);
        if(_typeName === "bool") return BigInt(`0x${value}`) === 1n;
        throw new Error(`MUDDecoder::_parseType - No parsing available for type ${typeName} (probably need a fresh implementation)`);
    }

    _removeLastValue(arr: any[]) {
        return arr.slice(0, arr.length - 2);
    }

    _removeBracketsStr(str: string) {
        const bracketCharsLength = 2;
        return str.slice(0, str.length - bracketCharsLength);
    }

    _getStaticSchema<T extends ValueSchema>(valueSchema: T) {
        return Object.fromEntries(
            Object.entries(valueSchema).filter(([, valueType]) => !valueType.includes("[]"))
        ) as T;
    }

    _getDynamicSchema<T extends ValueSchema>(valueSchema: T) {
        return Object.fromEntries(
            Object.entries(valueSchema).filter(([, valueType]) => valueType.includes("[]"))
        ) as T;
    }

    get BYTE_CHARS_LENGTH() {
        return this._BYTE_CHARS_LENGTH;
    }

    get tables() {
        return this._tables;
    }
    
}