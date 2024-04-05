# Mud Decoder

Decode data coming from a MUD table.

Work in a node environment.

### How to declare 

```ts
import { MUDDecoder } from "../src/MUDDecoder";

const decoder = new MUDDecoder({ // MUD tables goes here
    QueueUnits: {
        keySchema: { entity: "bytes32" },
        valueSchema: {
            front: "uint256",
            back: "uint256",
            queue: "bytes32[]",
        },
    }
});
```

### How does it work

- `decodeData`: Take the result, check the tables and determine how to decode the data

- `decodeStaticData`: If the data is a simple string, parse the bytes into a Javascript/Typescript variable (not all types are handled here, add them if needed) 

To add a type:

* Go to `types/index.d.ts`
* Add the type to the `SolidityType` type
* Go to `MUDDecoder::getTypeLengthInBytes` and add the length in bytes (uint256 is 64 bytes long, 128 chars long as 1 bytes = 2 chars)
* Go to `MUDDecoder::_parseType` and add how you would like to handle the parsing of the type (i.e. convert string to hex, or to bigint, or to number, ...)

- `decodeDynamicData`: Check each returned value, get their length, get the length of each array and pack them in their respecting array