---
title: Local State Link
---

## Purpose
An Apollo Link to easily manage local state!

## Installation

`npm install apollo-link-state --save`

### Experimental
The API of this libray is still in flux, for usage patterns check out the test suite, most importantly the `client` test suite

## Usage
Apollo Link State is an easy way to manage local application state with GraphQL and Apollo. Setting up local state can be done like so:

```js
import { withClientState } from 'apollo-link-state';
import { createHttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import { ApolloClient } from 'apollo-client';


// sugar for updating mutation
const update = (query, updater) => (result, variables, { cache }) => {
  const data = updater(client.readQuery({ query, variables }), variables);
  cache.writeQuery({ query, variables, data });
  return null;
};

const local = withClientState({
  Query: {
    // provide an initial state
    todos: () => [],
  },
  Mutation: {
    // update values in the store on mutations
    addTodo: update(query, ({ todos }, { message, title }) => ({
      todos: todos.concat([{ message, title, __typename: 'Todo' }]),
    })),
  },
});

const remote = createHttpLink();

const client = new ApolloClient({
  link: local.concat(remote),
  cache: new InMemoryCache()
});

// usage with query
const QUERY = gql`
 query LocalState {
  isConnected @client
 }
 ```

```
