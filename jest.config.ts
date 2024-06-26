/* eslint-disable */
export default {
    roots: ['<rootDir>'],
    transform: {
      '^.+\\.ts?$': 'ts-jest'
    },
    testRegex: '(/__tests__/.*|(\\.|/)(test|spec))\\.ts?$',
    moduleFileExtensions: ['ts', 'js', 'json', 'node'],
    clearMocks: true,
};