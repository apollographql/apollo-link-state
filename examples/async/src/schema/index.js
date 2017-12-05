/*
 * Schema
 *
 * this is a direct model of the previous redux data shape
 *
 * type Query {
 *  postsBySubreddit(subreddit: String!): Subreddit
 * }
 *
 * type Subreddit {
 *  items: [Post]
 *  lastUpdated: Number
 * }
 *
 * type Post {
 *  title: String
 * }
 *
 *
 */

export default {
  Query: {
    // this is only called on a cache miss
    postsBySubreddit: async (_, { subreddit }) => {
      try {
        // trigger request posts
        const items = await fetch(`https://www.reddit.com/r/${subreddit}.json`)
          .then(response => response.json())
          .then(json => json.data.children.map(child => child.data))
          .then(posts =>
            posts.map(({ title }) => ({ title, __typename: 'Post' })),
          );

        const data = {
          lastUpdated: Date.now(),
          items,
          id: subreddit,
          __typename: 'Subreddit',
        };

        return data;
      } catch (e) {
        console.error(e);
        return false;
      }
    },
  },
};
