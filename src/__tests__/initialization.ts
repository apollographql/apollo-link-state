import gql from 'graphql-tag';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { Observable, ApolloLink, execute } from 'apollo-link';

import { withClientState } from '../';

describe('initialization', () => {
  const resolvers = { Query: { foo: () => ({ bar: true }) } };
  const defaults = { foo: { bar: false, __typename: 'Bar' } };
  const query = gql`
    {
      foo @client {
        bar
      }
    }
  `;

  const remoteQuery = gql`
    {
      foo {
        bar
      }
    }
  `;

  const typeDefs = `
    type Todo {
      id: String
      message: String!
    }

    type Query {
      todo(id: String!): Todo
    }
  `;

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

    client
      .query({ query })
      .then(({ data }) => {
        expect(fooResolver).not.toHaveBeenCalled();
        expect(data.foo.bar).toEqual(false);
      })
      .catch(e => console.error(e));
  });

  it('adds a schema string in SDL format to the context as definition if typeDefs are passed in', done => {
    const nextLink = new ApolloLink(operation => {
      const { schemas } = operation.getContext();
      expect(schemas).toMatchSnapshot();
      return Observable.of({
        data: { foo: { bar: true, __typename: 'Bar' } },
      });
    });

    const client = withClientState({ resolvers, defaults, typeDefs });

    execute(client.concat(nextLink), {
      query: remoteQuery,
    }).subscribe(() => done(), done.fail);
  });

  it('concatenates schema strings if typeDefs are passed in as an array', done => {
    const anotherSchema = `
      type Foo {
        foo: String!
        bar: String
      }
    `;

    const nextLink = new ApolloLink(operation => {
      const { schemas } = operation.getContext();
      expect(schemas).toMatchSnapshot();
      return Observable.of({
        data: { foo: { bar: true, __typename: 'Bar' } },
      });
    });

    const client = withClientState({
      resolvers,
      defaults,
      typeDefs: [typeDefs, anotherSchema],
    });

    execute(client.concat(nextLink), {
      query: remoteQuery,
    }).subscribe(() => done(), done.fail);
  });
});
