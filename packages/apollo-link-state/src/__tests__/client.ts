import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import {
  InMemoryCache,
  IntrospectionFragmentMatcher,
} from 'apollo-cache-inmemory';

import { print } from 'graphql/language/printer';
import { parse } from 'graphql/language/parser';
import { introspectionQuery } from 'graphql/utilities';

import { withClientState } from '../';

const makeTerminatingCheck = (done, body) => {
  return (...args) => {
    try {
      body(...args);
      done();
    } catch (error) {
      done.fail(error);
    }
  };
};

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
      expect({ ...data }).toMatchObject({ field: 1 });
    });
  });
  it('works for an introspection query', () => {
    const query = gql`${introspectionQuery}`;

    const link = new ApolloLink(() =>
      Observable.of({ errors: [{ message: 'no introspection result found' }] }),
    );
    const local = withClientState();

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local.concat(link),
    });

    return client
      .query({ query })
      .then(() => {
        throw new Error('should not call');
      })
      .catch(error => expect(error.message).toMatch(/no introspection/));
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
      expect({ ...data }).toMatchObject({ field: 1 });
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
        expect({ ...data }).toMatchObject({ field: 1 });
        expect(count).toBe(1);
      })
      .then(() =>
        client.query({ query }).then(({ data }) => {
          expect({ ...data }).toMatchObject({ field: 1 });
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
        expect({ ...data }).toMatchObject({ field: 1 });
        expect(count).toBe(1);
      })
      .then(() =>
        client
          .query({ query, fetchPolicy: 'network-only' })
          .then(({ data }) => {
            expect({ ...data }).toMatchObject({ field: 1 });
            expect(count).toBe(2);
          }),
      );
  });
  it('supports subscriptions', done => {
    const query = gql`
      subscription {
        field
      }
    `;

    const link = new ApolloLink(() =>
      Observable.of({ data: { field: 1 } }, { data: { field: 2 } }),
    );
    const local = withClientState();

    const client = new ApolloClient({
      cache: new InMemoryCache(),
      link: local.concat(link),
    });

    let counter = 0;
    expect.assertions(2);
    return client.subscribe({ query }).forEach(item => {
      expect(item).toMatchObject({ data: { field: ++counter } });
      if (counter === 2) {
        done();
      }
    });
  });
  it('uses fragment matcher', () => {
    const query = gql`
      {
        foo {
          ... on Bar {
            bar @client
          }
          ... on Baz {
            baz @client
          }
        }
      }
    `;

    const link = new ApolloLink(() =>
      Observable.of({
        data: { foo: [{ __typename: 'Bar' }, { __typename: 'Baz' }] },
      }),
    );
    const local = withClientState({
      resolvers: {
        Bar: {
          bar: () => 'Bar',
        },
        Baz: {
          baz: () => 'Baz',
        },
      },
      fragmentMatcher: ({ __typename }, typeCondition) =>
        __typename === typeCondition,
    });

    const client = new ApolloClient({
      cache: new InMemoryCache({
        fragmentMatcher: new IntrospectionFragmentMatcher({
          introspectionQueryResultData: {
            __schema: {
              types: [
                {
                  kind: 'UnionTypeDefinition',
                  name: 'Foo',
                  possibleTypes: [{ name: 'Bar' }, { name: 'Baz' }],
                },
              ],
            },
          },
        }),
      }),
      link: local.concat(link),
    });

    return client.query({ query }).then(({ data }) => {
      expect(data).toMatchObject({ foo: [{ bar: 'Bar' }, { baz: 'Baz' }] });
    });
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
      .then(({ data }) => expect({ ...data }).toMatchObject({ field: 'yo' }));
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
        expect({ ...data }).toMatchObject({ field: 1 });
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
          expect({ ...data }).toMatchObject({ field: 0 });
          client.mutate({ mutation });
        }

        if (count === 2) {
          expect({ ...data }).toMatchObject({ field: 1 });
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
        expect({ ...data }).toMatchObject({ field: '1234' });
      });
  });

  it('writeDefaults lets you write defaults to the cache after the store is reset', done => {
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

    client
      .query({ query })
      .then(({ data }) => {
        expect({ ...data }).toMatchObject({ foo: 'bar' });
      })
      .catch(done.fail);

    client
      .mutate({ mutation })
      .then(() => client.query({ query }))
      .then(({ data }) => {
        expect({ ...data }).toMatchObject({ foo: 'woo' });
      })
      //should be default after this reset call
      .then(() => client.resetStore() as Promise<null>)
      .then(() => client.query({ query }))
      .then(({ data }) => {
        expect({ ...data }).toMatchObject({ foo: 'bar' });
        done();
      })
      .catch(done.fail);
  });

  describe('after resetStore', () => {
    const counterQuery = gql`
      query {
        counter @client
      }
    `;

    const plusMutation = gql`
      mutation plus {
        plus @client
      }
    `;

    //ensures no warnings
    let oldWarn;
    let cache: InMemoryCache;
    beforeEach(() => {
      oldWarn = console.warn;
      console.warn = message => {
        fail(`warn should not be called, message: ${message}`);
      };

      cache = new InMemoryCache();
    });

    afterEach(() => {
      console.warn = oldWarn;
    });

    const createClient = stateLink =>
      new ApolloClient({
        cache,
        link: ApolloLink.from([
          stateLink,
          new ApolloLink(() => {
            throw Error('should never call forward');
          }),
        ]),
      });

    it('returns the default data after resetStore with no Query specified', done => {
      const stateLink = withClientState({
        cache,
        resolvers: {
          Mutation: {
            plus: (_, __, { cache }) => {
              const { counter } = cache.readQuery({ query: counterQuery });
              const data = {
                counter: counter + 1,
              };
              cache.writeData({ data });
              return null;
            },
          },
        },
        defaults: {
          counter: 10,
        },
      });

      const checkedCount = [10, 11, 12, 10];
      const client = createClient(stateLink);

      const componentObservable = client.watchQuery({ query: counterQuery });
      const unsub = componentObservable.subscribe({
        next: ({ data }) => {
          try {
            expect(data).toMatchObject({ counter: checkedCount.shift() });
          } catch (e) {
            done.fail(e);
          }
        },
        error: done.fail,
        complete: done.fail,
      });

      client
        .mutate({ mutation: plusMutation })
        .then(() => {
          expect(cache.readQuery({ query: counterQuery })).toMatchObject({
            counter: 11,
          });
          expect(client.query({ query: counterQuery })).resolves.toMatchObject({
            data: { counter: 11 },
          });
        })
        .then(() => client.mutate({ mutation: plusMutation }))
        .then(() => {
          expect(cache.readQuery({ query: counterQuery })).toMatchObject({
            counter: 12,
          });
          expect(client.query({ query: counterQuery })).resolves.toMatchObject({
            data: { counter: 12 },
          });
        })
        .then(() => client.resetStore() as Promise<null>)
        .then(() => {
          expect(client.query({ query: counterQuery }))
            .resolves.toMatchObject({ data: { counter: 10 } })
            .then(() => {
              expect(checkedCount.length).toBe(0);
              done();
            });
        })
        .catch(done.fail);
    });

    it('returns the Query result after resetStore', async done => {
      const stateLink = withClientState({
        cache,
        resolvers: {
          Query: {
            counter: () => 0,
          },
          Mutation: {
            plus: (_, __, { cache }) => {
              const { counter } = cache.readQuery({ query: counterQuery });
              const data = {
                counter: counter + 1,
              };
              cache.writeData({ data });
              return null;
            },
          },
        },
        defaults: {
          counter: 10,
        },
      });

      const client = createClient(stateLink);
      await client.mutate({ mutation: plusMutation });
      expect(cache.readQuery({ query: counterQuery })).toMatchObject({
        counter: 11,
      });

      await client.mutate({ mutation: plusMutation });
      expect(cache.readQuery({ query: counterQuery })).toMatchObject({
        counter: 12,
      });
      await expect(
        client.query({ query: counterQuery }),
      ).resolves.toMatchObject({
        data: { counter: 12 },
      });

      (client.resetStore() as Promise<null>)
        .then(() => {
          expect(client.query({ query: counterQuery }))
            .resolves.toMatchObject({ data: { counter: 0 } })
            .then(done)
            .catch(done.fail);
        })
        .catch(done.fail);
    });

    //should work, but currently does not due to resetStore calling broadcastQueries, then the onResetStore callbacks
    it.skip('returns the default data from cache in a Query resolver with writeDefaults callback enabled', done => {
      const stateLink = withClientState({
        cache,
        resolvers: {
          Query: {
            counter: () => {
              //This cache read does not see any data
              return (cache.readQuery({ query: counterQuery }) as any).counter;
            },
          },
          Mutation: {
            plus: (_, __, { cache }) => {
              const { counter } = cache.readQuery({ query: counterQuery });
              const data = {
                counter: counter + 1,
              };
              cache.writeData({ data });
              return null;
            },
          },
        },
        defaults: {
          counter: 10,
        },
      });

      const client = createClient(stateLink);
      client.onResetStore(stateLink.writeDefaults);

      client.mutate({ mutation: plusMutation });
      client.mutate({ mutation: plusMutation });
      expect(cache.readQuery({ query: counterQuery })).toMatchObject({
        counter: 12,
      });
      expect(client.query({ query: counterQuery })).resolves.toMatchObject({
        data: { counter: 12 },
      });

      let called = false;
      const componentObservable = client.watchQuery({ query: counterQuery });

      const unsub = componentObservable.subscribe({
        next: ({ data }) => {
          try {
            //this fails
            expect(data).toMatchObject({ counter: 10 });
            called = true;
          } catch (e) {
            done.fail(e);
          }
        },
        error: done.fail,
        complete: done.fail,
      });

      (client.resetStore() as Promise<null>)
        .then(() => {
          expect(client.query({ query: counterQuery }))
            .resolves.toMatchObject({ data: { counter: 10 } })
            .then(
              makeTerminatingCheck(
                () => {
                  unsub.unsubscribe();
                  done();
                },
                () => {
                  expect(called);
                },
              ),
            )
            .catch(done.fail);
        })
        .catch(done.fail);
    });

    it('find no data from cache in a Query resolver with no writeDefaults callback enabled', done => {
      const stateLink = withClientState({
        cache,
        resolvers: {
          Query: {
            counter: () => {
              try {
                return (cache.readQuery({ query: counterQuery }) as any)
                  .counter;
              } catch (error) {
                try {
                  expect(error.message).toMatch(/field counter/);
                } catch (e) {
                  done.fail(e);
                }
                unsub.unsubscribe();
                done();
              }
              return -1; // to remove warning from in-memory-cache
            },
          },
        },
        defaults: {
          counter: 10,
        },
      });

      const client = createClient(stateLink);
      const componentObservable = client.watchQuery({ query: counterQuery });

      const unsub = componentObservable.subscribe({
        next: ({ data }) => done.fail,
        error: done.fail,
        complete: done.fail,
      });

      client.resetStore() as Promise<null>;
    });

    it('should warn when no default or Query resolver specified', done => {
      console.warn = message => {
        unsub.unsubscribe();
        done();
      };

      const stateLink = withClientState({
        cache,
        resolvers: {
          Query: {
            counter: () => {},
          }, //return empty object, does not have counter field
          Mutation: {
            plus: (_, __, { cache }) => {
              const { counter } = cache.readQuery({ query: counterQuery });
              const data = {
                counter: counter + 1,
              };
              cache.writeData({ data });
              return null;
            },
          },
        },
        defaults: {
          counter: 10,
        },
      });

      const client = createClient(stateLink);
      client.mutate({ mutation: plusMutation });

      const componentObservable = client.watchQuery({ query: counterQuery });

      let calledOnce = true;
      const unsub = componentObservable.subscribe({
        next: data => {
          try {
            expect(calledOnce);
            calledOnce = false;
          } catch (e) {
            done.fail(e);
          }
        },
        error: done.fail,
        complete: done.fail,
      });

      client.resetStore();
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
          try {
            expect({ ...data }).toMatchObject({ count: 0, lastCount: 1 });
          } catch (e) {
            done.fail(e);
          }
          client.mutate({ mutation: increment, variables: { amount: 2 } });
        }

        if (count === 2) {
          try {
            expect({ ...data }).toMatchObject({ count: 2, lastCount: 1 });
          } catch (e) {
            done.fail(e);
          }
          client.mutate({ mutation: decrement, variables: { amount: 1 } });
        }
        if (count === 3) {
          try {
            expect({ ...data }).toMatchObject({ count: 1, lastCount: 1 });
          } catch (e) {
            done.fail(e);
          }
          done();
        }
      },
      error: e => done.fail(e),
      complete: done.fail,
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
          expect({ ...data }).toMatchObject({ todos: [] });
          client.mutate({
            mutation,
            variables: {
              title: 'Apollo Client 2.0',
              message: 'ship it',
            },
          });
        } else if (count === 2) {
          expect(data.todos.map(x => ({ ...x }))).toMatchObject([
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
