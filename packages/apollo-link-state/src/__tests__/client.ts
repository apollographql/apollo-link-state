import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { print } from 'graphql/language/printer';
import { parse } from 'graphql/language/parser';

import { withClientState } from '../';

describe('non cache usage', () => {
  it("doesn't stop normal operations from working", () => {
    const query = gql`
      {
        field
      }
    `;

    const link = new ApolloLink(() => Observable.of({ data: { field: 1 } }));
    const local = withClientState();

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local.concat(link),
    });

    return client.query({ query }).then(({ data }) => {
      expect({ ...data }).toEqual({ field: 1 });
    });
  });
  it('lets you set default values from resolvers', () => {
    const query = gql`
      {
        field @client
      }
    `;

    const local = withClientState({
      resolvers: {
        Query: {
          field: () => 1,
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    return client.query({ query }).then(({ data }) => {
      expect({ ...data }).toEqual({ field: 1 });
    });
  });
  it('caches the data for future lookups', () => {
    const query = gql`
      {
        field @client
      }
    `;

    let count = 0;
    const local = withClientState({
      resolvers: {
        Query: {
          field: () => {
            count++;
            return 1;
          },
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    return client
      .query({ query })
      .then(({ data }) => {
        expect({ ...data }).toEqual({ field: 1 });
        expect(count).toBe(1);
      })
      .then(() =>
        client.query({ query }).then(({ data }) => {
          expect({ ...data }).toEqual({ field: 1 });
          expect(count).toBe(1);
        }),
      );
  });
  it('honors fetchPolicy', () => {
    const query = gql`
      {
        field @client
      }
    `;

    let count = 0;
    const local = withClientState({
      resolvers: {
        Query: {
          field: () => {
            count++;
            return 1;
          },
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    return client
      .query({ query })
      .then(({ data }) => {
        expect({ ...data }).toEqual({ field: 1 });
        expect(count).toBe(1);
      })
      .then(() =>
        client
          .query({ query, fetchPolicy: 'network-only' })
          .then(({ data }) => {
            expect({ ...data }).toEqual({ field: 1 });
            expect(count).toBe(2);
          }),
      );
  });
});

describe('cache usage', () => {
  it('still lets you query the cache without passing in a resolver map', () => {
    const query = gql`
      {
        field @client
      }
    `;

    const cache = new InMemoryCache();
    const client = new ApolloClient({
      cache,
      link: withClientState(),
    });

    cache.writeQuery({ query, data: { field: 'yo' } });

    client
      .query({ query })
      .then(({ data }) => expect({ ...data }).toEqual({ field: 'yo' }));
  });
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
          start: (_, $, { cache }: { cache: InMemoryCache }) => {
            cache.writeQuery({ query, data: { field: 1 } });
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
  it('lets you write to the cache with a mutation and it rerenders automatically', done => {
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
        Query: {
          field: () => 0,
        },
        Mutation: {
          start: (_, $, { cache }: { cache: InMemoryCache }) => {
            cache.writeQuery({ query, data: { field: 1 } });
            return { start: true };
          },
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    let count = 0;
    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        count++;
        if (count === 1) {
          expect({ ...data }).toEqual({ field: 0 });
          client.mutate({ mutation });
        }

        if (count === 2) {
          expect({ ...data }).toEqual({ field: 1 });
          done();
        }
      },
    });
  });
  it('lets you write to the cache with a mutation using variables', () => {
    const query = gql`
      {
        field @client
      }
    `;

    const mutation = gql`
      mutation start($id: ID!) {
        start(field: $id) @client {
          field
        }
      }
    `;

    const local = withClientState({
      resolvers: {
        Mutation: {
          start: (_, variables, { cache }) => {
            cache.writeQuery({ query, data: { field: variables.field } });
            return {
              __typename: 'Field',
              field: variables.field,
            };
          },
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    return client
      .mutate({ mutation, variables: { id: '1234' } })
      .then(({ data }) => {
        expect({ ...data }).toEqual({
          start: { field: '1234', __typename: 'Field' },
        });
      })
      .then(() => client.query({ query }))
      .then(({ data }) => {
        expect({ ...data }).toEqual({ field: '1234' });
      });
  });

  it('runs default resolvers for aliased fields tagged with @client', () => {
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

  it('writeDefaults lets you write defaults to the cache after the store is reset', async () => {
    const mutation = gql`
      mutation foo {
        foo @client
      }
    `;

    const query = gql`
      {
        foo @client
      }
    `;

    const cache = new InMemoryCache();

    const stateLink = withClientState({
      defaults: {
        foo: 'bar',
      },
      resolvers: {
        Mutation: {
          foo: (_, $, { cache }) => {
            cache.writeData({ data: { foo: 'woo' } });
            return null;
          },
        },
      },
      cache,
    });

    const client = new ApolloClient({
      cache,
      link: stateLink,
    });

    client.onResetStore(stateLink.writeDefaults);

    client.query({ query }).then(({ data }) => {
      expect({ ...data }).toEqual({ foo: 'bar' });
    });

    client
      .mutate({ mutation })
      .then(() => client.query({ query }))
      .then(({ data }) => {
        expect({ ...data }).toEqual({ foo: 'woo' });
      });

    await client.resetStore();

    client.query({ query }).then(({ data }) => {
      expect({ ...data }).toEqual({ foo: 'bar' });
    });
  });
});

describe('sample usage', () => {
  it('works for a simple counter app', done => {
    const query = gql`
      query GetCount {
        count @client
        lastCount # stored in db on server
      }
    `;

    const increment = gql`
      mutation Increment($amount: Int = 1) {
        increment(amount: $amount) @client
      }
    `;

    const decrement = gql`
      mutation Decrement($amount: Int = 1) {
        decrement(amount: $amount) @client
      }
    `;

    const update = (query, updater) => (result, variables, { cache }) => {
      const data = updater(client.readQuery({ query, variables }), variables);
      cache.writeQuery({ query, variables, data });
      return null;
    };

    const local = withClientState({
      resolvers: {
        Query: {
          // initial count
          count: () => 0,
        },
        Mutation: {
          increment: update(query, ({ count, ...rest }, { amount }) => ({
            ...rest,
            count: count + amount,
          })),
          decrement: update(query, ({ count, ...rest }, { amount }) => ({
            ...rest,
            count: count - amount,
          })),
        },
      },
    });

    const http = new ApolloLink(operation => {
      expect(operation.operationName).toBe('GetCount');
      return Observable.of({ data: { lastCount: 1 } });
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local.concat(http),
    });

    let count = 0;
    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        count++;
        if (count === 1) {
          expect({ ...data }).toEqual({ count: 0, lastCount: 1 });
          client.mutate({ mutation: increment, variables: { amount: 2 } });
        }

        if (count === 2) {
          expect({ ...data }).toEqual({ count: 2, lastCount: 1 });
          client.mutate({ mutation: decrement, variables: { amount: 1 } });
        }
        if (count === 3) {
          expect({ ...data }).toEqual({ count: 1, lastCount: 1 });
          done();
        }
      },
    });
  });
  it('works for a simple todo app', done => {
    const query = gql`
      query GetTasks {
        todos @client {
          message
          title
        }
      }
    `;

    const mutation = gql`
      mutation AddTodo($message: String, $title: String) {
        addTodo(message: $message, title: $title) @client
      }
    `;

    const update = (query, updater) => (result, variables, { cache }) => {
      const data = updater(client.readQuery({ query, variables }), variables);
      cache.writeQuery({ query, variables, data });
      return null;
    };

    const local = withClientState({
      resolvers: {
        Query: {
          todos: () => [],
        },
        Mutation: {
          addTodo: update(query, ({ todos }, { message, title }) => ({
            todos: todos.concat([{ message, title, __typename: 'Todo' }]),
          })),
        },
      },
    });

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local,
    });

    let count = 0;
    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        count++;
        if (count === 1) {
          expect({ ...data }).toEqual({ todos: [] });
          client.mutate({
            mutation,
            variables: {
              title: 'Apollo Client 2.0',
              message: 'ship it',
            },
          });
        } else if (count === 2) {
          expect(data.todos.map(x => ({ ...x }))).toEqual([
            {
              title: 'Apollo Client 2.0',
              message: 'ship it',
              __typename: 'Todo',
            },
          ]);
          done();
        }
      },
    });
  });
});
