import gql from 'graphql-tag';

export default {
  Query: {
    visibilityFilter: () => 'SHOW_ALL',
  },
  Mutation: {
    visibilityFilter: (_, { filter }, { cache }) => {
      cache.writeQuery({
        query: gql`
          {
            visibilityFilter @client
          }
        `,
        data: { visibilityFilter: filter },
      });
      return { visibilityFilter: filter };
    },
  },
};
