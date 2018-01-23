import gql from 'graphql-tag';
import { graphql } from 'react-apollo';

import Link from '../components/Link';

const VISIBILITY_QUERY = gql`
  {
    visibilityFilter @client
  }
`;

const withActiveState = graphql(VISIBILITY_QUERY, {
  props: ({ ownProps, data }) => ({
    active: ownProps.filter === data.visibilityFilter,
  }),
});

const VISIBILITY_MUTATION = gql`
  mutation SetFilter($filter: String!) {
    visibilityFilter(filter: $filter) @client
  }
`;
const setVisibilityFilter = graphql(VISIBILITY_MUTATION, {
  props: ({ mutate, ownProps }) => ({
    onClick: () => mutate({ variables: { filter: ownProps.filter } }),
  }),
});

const FilterLink = setVisibilityFilter(withActiveState(Link));

export default FilterLink;
