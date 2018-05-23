import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { withClientState } from '../';

const resolvers = {
  Query: {
    foo: () => ({ bar: true }),
  },
};

it('runs resolvers for missing client queries with aliased field', done => {
  expect.assertions(1);
  const query = gql`
    query Aliased {
      foo @client {
        bar
      }
      baz: bar {
        foo
      }
    }
  `;
  const sample = new ApolloLink(() =>
    // Each link is responsible for implementing their own aliasing so it returns baz not bar
    Observable.of({ data: { baz: { foo: true } } }),
  );
  const clientLink = withClientState({
    resolvers,
  });
  return execute(clientLink.concat(sample), { query }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: true }, baz: { foo: true } });
    } catch (e) {
      done.fail(e);
      return;
    }
    done();
  }, done.fail);
});

it('runs resolvers for client queries when aliases are in use on the @client-tagged node', done => {
  const aliasedQuery = gql`
    query Test {
      fie: foo @client {
        bar
      }
    }
  `;
  const client = withClientState({
    resolvers: {
      Query: {
        foo: () => ({ bar: true }),
        fie: () => {
          done.fail(
            "Called the resolver using the alias' name, instead of the correct resolver name.",
          );
        },
      },
    },
  });
  execute(client, { query: aliasedQuery }).subscribe(({ data }) => {
    expect(data).toEqual({ fie: { bar: true } });
    done();
  }, done.fail);
});

it('respects aliases for *nested fields* on the @client-tagged node', done => {
  const aliasedQuery = gql`
    query Test {
      fie: foo @client {
        fum: bar
      }
      baz: bar {
        foo
      }
    }
  `;
  const clientLink = withClientState({
    resolvers: {
      Query: {
        foo: () => ({ bar: true }),
        fie: () => {
          done.fail(
            "Called the resolver using the alias' name, instead of the correct resolver name.",
          );
        },
      },
    },
  });
  const sample = new ApolloLink(() =>
    Observable.of({ data: { baz: { foo: true } } }),
  );
  execute(clientLink.concat(sample), {
    query: aliasedQuery,
  }).subscribe(({ data }) => {
    expect(data).toEqual({ fie: { fum: true }, baz: { foo: true } });
    done();
  }, done.fail);
});

it('runs default resolvers for aliased fields tagged with @client', () => {
  expect.assertions(1);
  const query = gql`
    {
      fie: foo @client {
        bar
      }
    }
  `;

  const cache = new InMemoryCache();

  const client = new ApolloClient({
    cache,
    link: withClientState({
      cache,
      resolvers: {},
      defaults: {
        foo: {
          bar: 'yo',
          __typename: 'Foo',
        },
      },
    }),
  });

  return client.query({ query }).then(({ data }) => {
    expect({ ...data }).toMatchObject({
      fie: { bar: 'yo', __typename: 'Foo' },
    });
  });
});
