import { ApolloLink, Observable, Operation, NextLink } from 'apollo-link';

import { hasDirectives, getMainDefinition } from 'apollo-utilities';
import graphql from 'graphql-anywhere';

import { removeClientSetsFromDocument } from './utils';

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

export const withClientState = resolvers => {
  return new ApolloLink((operation: Operation, forward: NextLink) => {
    const isClient = hasDirectives(['client'], operation.query);

    if (!isClient) return forward(operation);

    const server = removeClientSetsFromDocument(operation.query);
    const { query } = operation;
    const type =
      capitalizeFirstLetter(
        (getMainDefinition(query) || ({} as any)).operation,
      ) || 'Query';

    return new Observable(observer => {
      if (server) operation.query = server;
      const obs = (server && forward) ? forward(operation) : Observable.of({ data: {} });

      const sub = obs.subscribe({
        next: ({ data, errors }) => {
          const resolver = (fieldName, rootValue = {}, args, context, info) => {
            const fieldValue = rootValue[info.resultKey || fieldName];
            if (fieldValue !== undefined) return fieldValue;

            // Look for the field in the custom resolver map
            const resolve =
              resolvers[(rootValue as any).__typename || type][
                info.resultKey || fieldName
              ];
            if (resolve) return resolve(rootValue, args, context, info);
          };

          const mergedData = graphql(
            resolver,
            query,
            data,
            operation.getContext(),
            operation.variables,
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
