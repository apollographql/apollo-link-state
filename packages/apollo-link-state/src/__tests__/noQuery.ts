import { print } from 'graphql/language/printer';
import { parse } from 'graphql/language/parser';

import { documentFromPojo } from '../utils';

describe('writing data with no query', () => {
  describe('converts a JavaScript object to a query correctly', () => {
    it('basic', () => {
      expect(
        print(
          documentFromPojo({
            number: 5,
            bool: true,
            bool2: false,
            undef: undefined,
            nullField: null,
            str: 'string',
          }),
        ),
      ).toMatchSnapshot();
    });

    it('nested', () => {
      expect(
        print(
          documentFromPojo({
            number: 5,
            bool: true,
            nested: {
              bool2: false,
              undef: undefined,
              nullField: null,
              str: 'string',
            },
          }),
        ),
      ).toMatchSnapshot();
    });

    it('arrays', () => {
      expect(
        print(
          documentFromPojo({
            number: [5],
            bool: [[true]],
            nested: [
              {
                bool2: false,
                undef: undefined,
                nullField: null,
                str: 'string',
              },
            ],
          }),
        ),
      ).toMatchSnapshot();
    });
  });
});
