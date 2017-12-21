import gql from 'graphql-tag';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { withClientState } from '../';

describe('initialization', () => {
  const resolvers = { Query: { foo: () => ({ bar: true }) } };
  const defaults = { foo: { bar: false, __typename: 'Bar' } };

  it('attaches writeData to the cache if you pass in defaults', () => {
    const cache = {
      writeQuery: jest.fn(),
    };

    withClientState({ cache, resolvers, defaults });
    expect('cache.writeData').toBeDefined();
  });

  it('writes defaults to the cache upon initialization', () => {
    const cache = new InMemoryCache();

    withClientState({ cache, resolvers, defaults });
    expect(cache.extract()).toMatchSnapshot();
  });

  it(`doesn't call the resolver if the data is already in the cache`, () => {
    const fooResolver = jest.fn();
    const resolvers = { Query: { foo: fooResolver } };

    const cache = new InMemoryCache();
    const client = new ApolloClient({
      cache,
      link: withClientState({ cache, resolvers, defaults }),
    });

    const query = gql`
      {
        foo @client {
          bar
        }
      }
    `;

    client
      .query({ query })
      .then(({ data }) => {
        expect(fooResolver).not.toHaveBeenCalled();
        expect(data.foo.bar).toEqual(false);
      })
      .catch(e => console.error(e));
  });
});
