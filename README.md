# [apollo-link-state](https://www.apollographql.com/docs/link/links/state.html)

### Manage your local data with Apollo Client!

[**Docs**](https://www.apollographql.com/docs/link/links/state.html) | [**Announcement Post**](https://dev-blog.apollodata.com/the-future-of-state-management-dd410864cae2) | [**Tutorial Video by Sara Vieira**](https://youtu.be/2RvRcnD8wHY)

Managing remote data from an external API is simple with Apollo Client, but
where do we put all of our data that doesn't fit in that category? Nearly all
apps need some way to centralize client-side data from user interactions and device APIs.

In the past, Apollo users stored their application's local data in a separate
Redux or MobX store. With `apollo-link-state`, you no longer have to maintain a
second store for local state. You can instead use the Apollo Client cache as your single source of
truth that holds all of your local data alongside your remote data. To access or
update your local state, you use GraphQL queries and mutations just like you
would for data from a server.

When you use Apollo Client to manage your local state, you get all of the same
benefits you know and love like caching and offline persistence without having
to set these features up yourself. 🎉 On top of that, you also benefit from the [Apollo
DevTools](https://github.com/apollographql/apollo-client-devtools) for
debugging and visibility into your store.

<h2 id="start">Quick start</h2>

To get started, install `apollo-link-state` from npm:

```bash
npm install apollo-link-state --save
```

The rest of the instructions assume that you have already [set up Apollo
Client](https://github.com/apollographql/apollo-client#installation) in your application. After
you install the package, you can create your state link by calling
`withClientState` and passing in a resolver map. A resolver map describes how to
retrieve and update your local data.

Let's look at an example where we're using a GraphQL mutation to update whether
our network is connected with a boolean flag:

```js
import { withClientState } from 'apollo-link-state';

// This is the same cache you pass into new ApolloClient
const cache = new InMemoryCache(...);

const stateLink = withClientState({
  cache,
  resolvers: {
    Mutation: {
      updateNetworkStatus: (_, { isConnected }, { cache }) => {
        const data = {
          networkStatus: { isConnected },
        };
        cache.writeData({ data });
      },
    },
  }
});
```

To hook up your state link to Apollo Client, add it to the other links
in your Apollo Link chain. Your state link should be near the end of the chain, so that other links like `apollo-link-error` can also deal with local state requests. However, it should go before `HttpLink` so local queries and mutations are intercepted
before they hit the network. It should also go before
[`apollo-link-persisted-queries`](https://github.com/apollographql/apollo-link-persisted-queries)
if you are using persisted queries. Then, pass your link chain to the Apollo
Client constructor.

```js
const client = new ApolloClient({
  cache,
  link: ApolloLink.from([
    stateLink,
    new HttpLink()
  ]),
});
```

How do we differentiate a request for local data from a request that hits our
server? In our query or mutation, we specify which fields are client-only with a
`@client` directive. This tells our network stack to retrieve or update the data
in the cache with our resolver map that we passed into our state link.

```js
const UPDATE_NETWORK_STATUS = gql`
  mutation updateNetworkStatus($isConnected: Boolean) {
    updateNetworkStatus(isConnected: $isConnected) @client
  }
`;
```

To fire off the mutation from your component, bind your mutation to your
component via your favorite Apollo view layer integration just like you normally
would. Here's what this would look like for React:

```js
const WrappedComponent = graphql(UPDATE_NETWORK_STATUS, {
  props: ({ mutate }) => ({
    updateNetworkStatus: isConnected => mutate({ variables: { isConnected } }),
  }),
})(NetworkStatus);
```

What if we want to access our network status data from another component? Since
we don't know whether our `UPDATE_NETWORK_STATUS` mutation will fire before we
try to access the data, we should guard against undefined values by providing a
default state as part of the state link initialization:

```js
const stateLink = withClientState({
  cache,
  resolvers: {
    Mutation: {
      /* same as above */
    },
  },
  defaults: {
    networkStatus: {
      __typename: 'NetworkStatus',
      isConnected: true,
    }
  },
});
```

This is the same as calling `writeData` yourself with an initial value:

```js
// Same as passing defaults above
cache.writeData({
  networkStatus: {
    __typename: 'NetworkStatus',
    isConnected: true,
  }
});
```

How do we query the `networkStatus` from our component? Similar to mutations,
just use a query and the `@client` directive! With Apollo Link, we can combine
data sources, including your remote data, in one query.

In this example, the `articles` field will either hit the cache or fetch from
our GraphQL endpoint, depending on our fetch policy. Since `networkStatus` is
marked with `@client`, we know that this is local data, so it will resolve from
the cache.

```js
const GET_ARTICLES = gql`
  query {
    networkStatus @client {
      isConnected
    }
    articles {
      id
      title
    }
  }
`;
```

To retrieve the data in your component, bind your query to your component via
your favorite Apollo view layer integration just like you normally would. In this case, we'll use React as an example.
React Apollo will attach both your remote and local data to `props.data` while
tracking both loading and error states. Once the query returns a result, your
component will update reactively. Updates to Apollo Client state via `apollo-link-state` will also automatically update any components using that data in a query.

```js
const WrappedComponent = graphql(GET_ARTICLES, {
  props: ({ data: { networkStatus, articles, loading, error } }) => {
    if (loading) {
      return { loading };
    }

    if (error) {
      return { error };
    }

    return {
      loading,
      networkStatus,
      articles,
    };
  },
})(Articles);
```

For more detailed examples, plus in-depth explanations of resolvers, defaults, and more, please check out our official [docs page](https://www.apollographql.com/docs/link/links/state.html).

<h2 id="local-development">Local Development</h2>

If you're setting up for local development, and you want to integrate a local
branch of `apollo-link-state` into another application, remember that this
project is a Lerna monorepo: `./packages/apollo-link-state`

To link this in, do:

```shell
cd packages/apollo-link-state && yarn link
```

And in your development application do:

```shell
yarn link apollo-link-state
```

Finally, each time you make a change in apollo-link-state, you need to run:

```shell
yarn build && yarn bundle
```

Now you should be good to go!
