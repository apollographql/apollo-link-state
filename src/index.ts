import { ApolloLink, Observable, Operation, NextLink } from 'apollo-link';

import { hasDirectives, getMainDefinition } from 'apollo-utilities';
import graphql from 'graphql-anywhere';

import { removeDirectivesFromDocument } from './utils';

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

export const withClientState = resolvers => {
  return new ApolloLink((operation: Operation, forward: NextLink) => {
    const isClient = hasDirectives(['client'], operation.query);

    if (!isClient) return forward(operation);

    const server = removeDirectivesFromDocument(operation.query);
    const { query } = operation;
    const type =
      capitalizeFirstLetter(
        (getMainDefinition(query) || ({} as any)).operation
      ) || 'Query';

    return new Observable(observer => {
      const obs = server
        ? forward({ ...operation, query: server })
        : Observable.of({ data: {} });

      const sub = obs.subscribe({
        next: ({ data, errors }) => {
          const resolver = (fieldName, rootValue = {}, args, context, info) => {
            const fieldValue = rootValue[fieldName];
            if (fieldValue !== undefined) return fieldValue;

            // Look for the field in the custom resolver map
            const resolver =
              resolvers[(rootValue as any).__typename || type][fieldName];
            if (resolver) return resolver(fieldValue, args, context, info);
          };

          const mergedData = graphql(
            resolver,
            query,
            data,
            operation.getContext(),
            operation.variables
          );

          observer.next({ data: mergedData, errors });
        },
        error: observer.error.bind(observer),
        complete: observer.complete.bind(observer),
      });

      return () => {
        if (sub) sub.unsubscribe();
      };
    });
  });
};
