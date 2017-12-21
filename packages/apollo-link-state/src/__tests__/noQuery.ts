import gql from 'graphql-tag';
import { print } from 'graphql/language/printer';
import { parse } from 'graphql/language/parser';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { queryFromPojo, fragmentFromPojo } from '../utils';

import { withClientState, ApolloCacheClient } from '../';

describe('writing data with no query', () => {
  describe('converts a JavaScript object to a query correctly', () => {
    it('basic', () => {
      expect(
        print(
          queryFromPojo({
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
          queryFromPojo({
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
          queryFromPojo({
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

    it('fragments', () => {
      expect(
        print(
          fragmentFromPojo({
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

  describe('writeData on cache', () => {
    it('lets you write to the cache with a mutation', () => {
      const query = gql`
        {
          field @client
        }
      `;

      const mutation = gql`
        mutation start {
          start @client
        }
      `;

      const local = withClientState({
        resolvers: {
          Mutation: {
            start: (_, $, { cache }: { cache: ApolloCacheClient }) => {
              cache.writeData({ data: { field: 1 } });
              return { start: true };
            },
          },
        },
      });

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: local,
      });

      return client
        .mutate({ mutation })
        .then(() => client.query({ query }))
        .then(({ data }) => {
          expect({ ...data }).toEqual({ field: 1 });
        });
    });

    it('lets you write to the cache with a mutation using an ID', () => {
      const query = gql`
        {
          obj @client {
            field
          }
        }
      `;

      const mutation = gql`
        mutation start {
          start @client
        }
      `;

      const local = withClientState({
        resolvers: {
          Mutation: {
            start: (_, $, { cache }: { cache: ApolloCacheClient }) => {
              cache.writeQuery({
                query,
                data: {
                  obj: { field: 1, id: 'uniqueId', __typename: 'Object' },
                },
              });
              cache.writeData({ id: 'Object:uniqueId', data: { field: 2 } });
              return { start: true };
            },
          },
        },
      });

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: local,
      });

      return client
        .mutate({ mutation })
        .then(() => client.query({ query }))
        .then(({ data }: any) => {
          expect(data.obj.field).toEqual(2);
        });
    });

    it(`doesn't overwrite __typename when writing to the cache with an id`, () => {
      const query = gql`
        {
          obj @client {
            field {
              field2
            }
            id
          }
        }
      `;

      const mutation = gql`
        mutation start {
          start @client
        }
      `;

      const local = withClientState({
        resolvers: {
          Mutation: {
            start: (_, $, { cache }: { cache: ApolloCacheClient }) => {
              cache.writeQuery({
                query,
                data: {
                  obj: {
                    field: { field2: 1, __typename: 'Field' },
                    id: 'uniqueId',
                    __typename: 'Object',
                  },
                },
              });
              cache.writeData({
                id: 'Object:uniqueId',
                data: { field: { field2: 2, __typename: 'Field' } },
              });
              return { start: true };
            },
          },
        },
      });

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: local,
      });

      return client
        .mutate({ mutation })
        .then(() => client.query({ query }))
        .then(({ data }: any) => {
          expect(data.obj.__typename).toEqual('Object');
          expect(data.obj.field.__typename).toEqual('Field');
        })
        .catch(e => console.log(e));
    });

    it(`adds a __typename for an object without one when writing to the cache with an id`, () => {
      const query = gql`
        {
          obj @client {
            field {
              field2
            }
            id
          }
        }
      `;

      const mutation = gql`
        mutation start {
          start @client
        }
      `;

      const local = withClientState({
        resolvers: {
          Mutation: {
            start: (_, $, { cache }: { cache: ApolloCacheClient }) => {
              cache.writeQuery({
                query,
                data: {
                  obj: {
                    field: { field2: 1, __typename: 'Field' },
                    id: 'uniqueId',
                  },
                },
              });

              console.log(cache.extract());

              cache.writeData({
                id: '$ROOT_QUERY.obj',
                data: { field: { field2: 2, __typename: 'Field' } },
              });
              return { start: true };
            },
          },
        },
      });

      const client = new ApolloClient({
        cache: new InMemoryCache(),
        link: local,
      });

      return client
        .mutate({ mutation })
        .then(() => client.query({ query }))
        .then(({ data }: any) => {
          expect(data.obj.__typename).toEqual('__ClientData');
          expect(data.obj.field.__typename).toEqual('Field');
        })
        .catch(e => console.log(e));
    });
  });
});
