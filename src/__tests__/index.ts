import gql from 'graphql-tag';
import { ApolloLink, execute, Observable } from 'apollo-link';

import { print } from 'graphql/language/printer';

import { withClientState } from '../';

// const sleep = ms => new Promise(s => setTimeout(s, ms));
const query = gql`
  query Test {
    foo @client {
      bar
    }
  }
`;

const mixedQuery = gql`
  query Mixed {
    foo @client {
      bar
    }
    bar {
      foo
    }
  }
`;

const resolvers = {
  Query: {
    foo: () => ({ bar: true }),
  },
};

it('strips out the client directive and does not call other links if no more fields', done => {
  const nextLink = new ApolloLink(operation => {
    return done.fail(new Error('should not have called'));
  });

  const client = withClientState({ resolvers });

  execute(client.concat(nextLink), { query }).subscribe(result => {
    try {
      expect(result.data).toEqual({ foo: { bar: true } });
    } catch (error) {
      done.fail(error);
    }
    done();
  }, done.fail);
});

it('passes a query on to the next link', done => {
  const nextLink = new ApolloLink(operation => {
    try {
      expect(operation.getContext()).toMatchSnapshot();
      expect(print(operation.query)).toEqual(
        print(gql`
          query Mixed {
            bar {
              foo
            }
          }
        `),
      );
    } catch (error) {
      done.fail(error);
    }
    return Observable.of({ data: { bar: { foo: true } } });
  });

  const client = withClientState({ resolvers });

  execute(client.concat(nextLink), { query: mixedQuery }).subscribe(
    () => done(),
    done.fail,
  );
});

it('runs resolvers for client queries', done => {
  const client = withClientState({
    resolvers: {
      Query: {
        foo: () => ({ bar: true }),
      },
    },
  });
  execute(client, { query }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: true } });
    } catch (error) {
      done.fail(error);
    }
    done();
  }, done.fail);
});

it('runs resolvers for missing client queries with server data', done => {
  const query = gql`
    query Mixed {
      foo @client {
        bar
      }
      bar {
        baz
      }
    }
  `;
  const sample = new ApolloLink(() =>
    Observable.of({ data: { bar: { baz: true } } }),
  );
  const client = withClientState({ resolvers });
  execute(client.concat(sample), { query }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: true }, bar: { baz: true } });
    } catch (error) {
      done.fail(error);
    }
    done();
  }, done.fail);
});

it('runs resolvers for missing client queries with server data including fragments', done => {
  const query = gql`
    fragment client on ClientData {
      bar
    }

    query Mixed {
      foo @client {
        ...client
      }
      bar {
        baz
      }
    }
  `;
  const sample = new ApolloLink(() =>
    Observable.of({ data: { bar: { baz: true } } }),
  );
  const client = withClientState({ resolvers });
  execute(client.concat(sample), { query }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: true }, bar: { baz: true } });
    } catch (e) {
      done.fail(e);
    }
    done();
  }, done.fail);
});

it('runs resolvers for missing client queries with variables', done => {
  const query = gql`
    query WithVariables($id: ID!) {
      foo @client {
        bar(id: $id)
      }
    }
  `;
  const client = withClientState({
    resolvers: {
      Query: {
        foo: () => ({ __typename: 'Foo' }),
      },
      Foo: {
        bar: (data, { id }) => id,
      },
    },
  });
  execute(client, { query, variables: { id: 1 } }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: 1 } });
    } catch (error) {
      done.fail(error);
    }
    done();
  }, done.fail);
});

it('passes context to client resolvers', done => {
  const query = gql`
    query WithContext {
      foo @client {
        bar
      }
    }
  `;
  const client = withClientState({
    resolvers: {
      Query: {
        foo: () => ({ __typename: 'Foo' }),
      },
      Foo: {
        bar: (data, _, { id }) => id,
      },
    },
  });
  execute(client, { query, context: { id: 1 } }).subscribe(({ data }) => {
    try {
      expect(data).toEqual({ foo: { bar: 1 } });
    } catch (error) {
      done.fail(error);
    }
    done();
  }, done.fail);
});

it('calls resolvers on each request if the prop is a function', done => {
  const query = gql`
    query WithContext {
      foo @client {
        bar
      }
    }
  `;
  const resolversSpy = jest.fn();
  const resolvers = () => {
    resolversSpy();
    return {
      Query: {
        foo: () => ({ __typename: 'Foo' }),
      },
      Foo: {
        bar: () => 1,
      },
    };
  };

  const client = withClientState({
    resolvers,
  });

  // once
  execute(client, { query }).subscribe(({ data }) => {
    expect(data).toEqual({ foo: { bar: 1 } });

    // twice
    execute(client, { query }).subscribe(({ data }) => {
      expect(data).toEqual({ foo: { bar: 1 } });
      expect(resolversSpy).toHaveBeenCalledTimes(2);
      done();
    }, done.fail);
  }, done.fail);
});
