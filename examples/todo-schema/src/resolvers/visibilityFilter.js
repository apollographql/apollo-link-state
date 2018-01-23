const visibilityFilter = {
  defaults: {
    visibilityFilter: 'SHOW_ALL',
  },
  resolvers: {
    Mutation: {
      visibilityFilter: (_, { filter }, { cache }) => {
        cache.writeData({ data: { visibilityFilter: filter } });
        return null;
      },
    },
  },
};

export default visibilityFilter;
