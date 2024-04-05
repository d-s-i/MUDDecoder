import { MUDDecoder } from "../src/MUDDecoder";

const decoder = new MUDDecoder({
    QueueUnits: {
        keySchema: { entity: "bytes32" },
        valueSchema: {
            front: "uint256",
            back: "uint256",
            queue: "bytes32[]",
        },
    }
});

describe("MUDDecoder", function() {

    it("decodeData", function() {

        const res = {
            staticData: '0x00000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000002',
            encodedLengths: '0x0000000000000000000000000000000000000000000000004000000000000040',
            dynamicData: '0x54726964656e744d6172696e650000000000000000000000000000000000000054726964656e744d6172696e6500000000000000000000000000000000000000'
        };

        const decodedRes = decoder.decodeData(res, "QueueUnits");
        console.log("decodedRes", decodedRes);

    });

});