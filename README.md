Apollo State Link
---

## What is this?
An Apollo Link to easily manage local state!

**The API of this libray is still in flux, for usage patterns check out the test suite, most importantly the `client` and `advanced` test suite**

## But why?
State management is a problem that nearly every application runs into at some point or another. Application state tends to be a cross of UI interactions and remote data states, this is typically solved by using libraries like [redux]() and [MobX](), but what if you could keep using GraphQL like you do for your remote data. What if you could merge the two together easily?

Now you can! Apollo State Link allows you to declare resolvers for Queries, Mutations, and types (Subscriptions coming) to augment your server schema or create an entirely local one!

## Installation

`npm install apollo-link-state --save`


## Usage
Apollo Link State is an easy way to manage local application state with GraphQL and Apollo. Setting up local state can be done like so:

```js
import { withClientState } from 'apollo-link-state';

const local = withClientState({
  Query: {
    // provide an initial state
    todos: () => [],
  },
  Mutation: {
    // update values in the store on mutations
    addTodo: (_, { message, title }, { cache }) => {
      const current = client.readQuery({ query, variables });
      const data = {
        todos: current.todos.concat([
          { message, title, __typename: 'Todo' }
        ])
      };
      cache.writeQuery({ query, variables, data });
      return null;
    };
  },
});


// use the local link to create an Apollo Client instance

// usage with query
const query = gql`
  query todos {
    todos @client {
      message
      title
    }
  }
`
const initial = await client.query({ query });
// { data: { todos: [] } }

const mutation = gql`
  mutation addTodo($message: String, $title: String){
    addTodo(message: $message, title: $title) @client
  }
`

// add a todo
client.mutate({
  mutation,
  variables: {
    title: 'hello world',
    message: 'oh what a world this is'
  }
});

const initial = await client.query({ query });
/*
{
  data: {
    todos: [
      { title: 'hello world', message: 'oh what a world this is' }
    ]
  }
}
*/
```

### 
