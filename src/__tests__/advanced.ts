import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { InMemoryCache } from 'apollo-cache-inmemory';

import { withClientState } from '../';

describe('server and client state', () => {
  const query = gql`
    query list {
      list(name: "my list") {
        items {
          id
          name
          isDone
          isSelected @client
        }
      }
    }
  `;
  it('works to merge remote and local state', done => {
    const data = {
      list: {
        __typename: 'List',
        items: [
          { __typename: 'ListItem', id: 1, name: 'first', isDone: true },
          { __typename: 'ListItem', id: 2, name: 'second', isDone: false },
        ],
      },
    };
    // mocked endpoint acting as server data
    const http = new ApolloLink(() => Observable.of({ data }));

    const local = withClientState({
      resolvers: {
        Mutation: {
          toggleItem: async (_, { id }, { cache }) => {
            id = `ListItem:${id}`;
            const fragment = gql`
              fragment item on ListItem {
                __typename
                isSelected
              }
            `;
            const previous = cache.readFragment({ fragment, id });
            const data = {
              ...previous,
              isSelected: !previous.isSelected,
            };
            await cache.writeFragment({
              id,
              fragment,
              data,
            });

            return data;
          },
        },
        ListItem: {
          isSelected: (source, args, context) => {
            expect(source.name).toBeDefined();
            // list items default to an unselected state
            return false;
          },
        },
      },
    });

    const client = new ApolloClient({
      link: local.concat(http),
      cache: new InMemoryCache(),
    });

    const observer = client.watchQuery({ query });

    let count = 0;
    const sub = observer.subscribe({
      next: response => {
        if (count === 0) {
          const initial = { ...data };
          initial.list.items = initial.list.items.map(x => ({
            ...x,
            isSelected: false,
          }));
          expect(response.data).toMatchObject(initial);
        }
        if (count === 1) {
          expect(response.data.list.items[0].isSelected).toBe(true);
          expect(response.data.list.items[1].isSelected).toBe(false);
          done();
        }
        count++;
      },
      error: done.fail,
    });
    const variables = { id: 1 };
    const mutation = gql`
      mutation SelectItem($id: Int!) {
        toggleItem(id: $id) @client
      }
    `;
    // after initial result, toggle the state of one of the items
    setTimeout(() => {
      client.mutate({ mutation, variables });
    }, 10);
  });

  it('correctly propagates an error from a client-state resolver', async done => {
    const data = {
      list: {
        __typename: 'List',
        items: [
          { __typename: 'ListItem', id: 1, name: 'first', isDone: true },
          { __typename: 'ListItem', id: 2, name: 'second', isDone: false },
        ],
      },
    };
    // mocked endpoint acting as server data
    const http = new ApolloLink(() => Observable.of({ data }));

    const local = withClientState({
      resolvers: {
        Query: {
          hasBeenIllegallyTouched: (_, _v, _c) => {
            throw new Error('Illegal Query Operation Occurred');
          },
        },

        Mutation: {
          touchIllegally: (_, _v, _c) => {
            throw new Error('Illegal Mutation Operation Occurred');
          },
        },
      },
    });

    const client = new ApolloClient({
      link: local.concat(http),
      cache: new InMemoryCache(),
    });

    const variables = { id: 1 };
    const query = gql`
      query hasBeenIllegallyTouched($id: Int!) {
        hasBeenIllegallyTouched(id: $id) @client
      }
    `;
    const mutation = gql`
      mutation SelectItem($id: Int!) {
        touchIllegally(id: $id) @client
      }
    `;

    try {
      await client.query({ query, variables });
      done.fail('Should have thrown!');
    } catch (e) {
      // Test Passed!
      expect(() => {
        throw e;
      }).toThrowErrorMatchingSnapshot();
    }

    try {
      await client.mutate({ mutation, variables });
      done.fail('Should have thrown!');
    } catch (e) {
      // Test Passed!
      expect(() => {
        throw e;
      }).toThrowErrorMatchingSnapshot();
    }

    done();
  });
});

describe('combination of server and client queries', () => {
  it('simple query with both server and client fields', done => {
    const query = gql`
      query GetCount {
        count @client
        lastCount
      }
    `;
    const cache = new InMemoryCache();

    const local = withClientState({
      cache,
      defaults: {
        count: 0,
      },
      resolvers: {},
    });

    const http = new ApolloLink(operation => {
      expect(operation.operationName).toBe('GetCount');
      return Observable.of({ data: { lastCount: 1 } });
    });

    const client = new ApolloClient({
      cache,
      link: local.concat(http),
    });

    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        expect({ ...data }).toMatchObject({ count: 0, lastCount: 1 });
        done();
      },
    });
  });

  it('should support nested quering of both server and client fields', done => {
    const query = gql`
      query GetUser {
        user {
          firstName @client
          lastName
        }
      }
    `;
    const cache = new InMemoryCache();

    const local = withClientState({
      cache,
      defaults: {
        user: {
          __typename: 'User',
          firstName: 'John',
        },
      },
      resolvers: {},
    });

    const http = new ApolloLink(operation => {
      expect(operation.operationName).toBe('GetUser');
      return Observable.of({
        data: { user: { lastName: 'Doe', __typename: 'User' } },
      });
    });

    const client = new ApolloClient({
      cache,
      link: local.concat(http),
    });
    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        try {
          expect({ ...data.user }).toMatchObject({
            firstName: 'John',
            lastName: 'Doe',
            __typename: 'User',
          });
        } catch (e) {
          done.fail(e);
        }
        done();
      },
    });
  });

  it('combine both server and client mutations', done => {
    const query = gql`
      query SampleQuery {
        count @client
        user {
          firstName
        }
      }
    `;
    const mutation = gql`
      mutation SampleMutation {
        incrementCount @client
        updateUser(firstName: "Harry") {
          firstName
        }
      }
    `;

    const counterQuery = gql`
      {
        count @client
      }
    `;
    const userQuery = gql`
      {
        user {
          firstName
        }
      }
    `;
    const cache = new InMemoryCache();

    const local = withClientState({
      cache,
      defaults: {
        count: 0,
      },
      resolvers: {
        Mutation: {
          incrementCount: (_, __, { cache }) => {
            const { count } = cache.readQuery({ query: counterQuery });
            const data = { count: count + 1 };
            cache.writeData({ data });
            return null;
          },
        },
      },
    });

    let watchCount = 0;
    const http = new ApolloLink(operation => {
      if (operation.operationName === 'SampleQuery') {
        return Observable.of({
          data: { user: { __typename: 'User', firstName: 'John' } },
        });
      }
      if (operation.operationName === 'SampleMutation') {
        return Observable.of({
          data: { updateUser: { __typename: 'User', firstName: 'Harry' } },
        });
      }
    });

    const client = new ApolloClient({
      cache,
      link: local.concat(http),
    });

    client.watchQuery({ query }).subscribe({
      next: ({ data }) => {
        if (watchCount === 0) {
          expect(data.count).toEqual(0);
          expect({ ...data.user }).toMatchObject({
            __typename: 'User',
            firstName: 'John',
          });
          watchCount += 1;
          client.mutate({
            mutation,
            update: (proxy, { data: { updateUser } }) => {
              proxy.writeQuery({
                query: userQuery,
                data: {
                  user: { ...updateUser },
                },
              });
            },
          });
        } else {
          expect(data.count).toEqual(1);
          expect({ ...data.user }).toMatchObject({
            __typename: 'User',
            firstName: 'Harry',
          });
          done();
        }
      },
    });
  });
});
