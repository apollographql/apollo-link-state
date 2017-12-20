export default {
  Query: {
    visibilityFilter: () => 'SHOW_ALL',
  },
  Mutation: {
    visibilityFilter: (_, { filter }, { cache }) => {
      const data = { visibilityFilter: filter };
      cache.writeData({ data: { visibilityFilter: filter } });
      return data;
    },
  },
};
