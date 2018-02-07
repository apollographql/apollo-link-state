import { print } from 'graphql/language/printer';
import gql from 'graphql-tag';
import { getDirectivesFromDocument } from '../transform';
import { disableFragmentWarnings } from 'graphql-tag';

// Turn off warnings for repeated fragment names
disableFragmentWarnings();

describe('getDirectivesFromDocument', () => {
  it('should get query with fields of storage directive ', () => {
    const query = gql`
      query Simple {
        field @storage(if: true)
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'storage' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with fields of storage directive [test function] ', () => {
    const query = gql`
      query Simple {
        field @storage(if: true)
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
      }
    `;
    const test = ({ name: { value } }) => value === 'storage';
    const doc = getDirectivesFromDocument([{ test }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should only get query with fields of storage directive ', () => {
    const query = gql`
      query Simple {
        maybe @skip(if: false)
        field @storage(if: true)
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'storage' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should only get query with multiple fields of storage directive ', () => {
    const query = gql`
      query Simple {
        maybe @skip(if: false)
        field @storage(if: true)
        other @storage
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
        other @storage
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'storage' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with fields of both storage and client directives ', () => {
    const query = gql`
      query Simple {
        maybe @skip(if: false)
        field @storage(if: true)
        user @client
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
        user @client
      }
    `;
    const doc = getDirectivesFromDocument(
      [{ name: 'storage' }, { name: 'client' }],
      query,
    );
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with different types of directive matchers ', () => {
    const query = gql`
      query Simple {
        maybe @skip(if: false)
        field @storage(if: true)
        user @client
      }
    `;

    const expected = gql`
      query Simple {
        field @storage(if: true)
        user @client
      }
    `;
    const doc = getDirectivesFromDocument(
      [
        { name: 'storage' },
        { test: directive => directive.name.value === 'client' },
      ],
      query,
    );
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with nested fields ', () => {
    const query = gql`
      query Simple {
        user {
          firstName @client
          email
        }
      }
    `;

    const expected = gql`
      query Simple {
        user {
          firstName @client
        }
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should include all the nested fields of field that has client directive ', () => {
    const query = gql`
      query Simple {
        user @client {
          firstName
          email
        }
      }
    `;

    const expected = gql`
      query Simple {
        user @client {
          firstName
          email
        }
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should return null if the query is no longer valid', () => {
    const query = gql`
      query Simple {
        field
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(null);
  });

  it('should get query with client fields in fragment', function() {
    const query = gql`
      query Simple {
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
        other
      }
    `;
    const expected = gql`
      query Simple {
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with client fields in fragment with nested fields', function() {
    const query = gql`
      query Simple {
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        user {
          firstName @client
          lastName
        }
      }
    `;
    const expected = gql`
      query Simple {
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        user {
          firstName @client
        }
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it('should get query with client fields in multiple fragments', function() {
    const query = gql`
      query Simple {
        ...fragmentSpread
        ...anotherFragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
        other
      }

      fragment anotherFragmentSpread on AnotherThing {
        user @client
        product
      }
    `;
    const expected = gql`
      query Simple {
        ...fragmentSpread
        ...anotherFragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
      }

      fragment anotherFragmentSpread on AnotherThing {
        user @client
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });

  it("should return null if fragment didn't have client fields", function() {
    const query = gql`
      query Simple {
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        field
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(null));
  });

  it('should get query with client fields when both fields and fragements are mixed', function() {
    const query = gql`
      query Simple {
        user @client
        product @storage
        order
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
        other
      }
    `;
    const expected = gql`
      query Simple {
        user @client
        ...fragmentSpread
      }

      fragment fragmentSpread on Thing {
        field @client
      }
    `;
    const doc = getDirectivesFromDocument([{ name: 'client' }], query);
    expect(print(doc)).toBe(print(expected));
  });
});
