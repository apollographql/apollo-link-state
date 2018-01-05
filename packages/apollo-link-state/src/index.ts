import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';
import { ApolloCache } from 'apollo-cache';

import { hasDirectives, getMainDefinition } from 'apollo-utilities';
import { graphql } from 'graphql-anywhere/lib/async';

import { removeClientSetsFromDocument } from './utils';

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

export type ClientStateConfig = {
  cache?: ApolloCache<any>;
  resolvers: any;
  defaults?: any;
};

export const withClientState = (
  { resolvers, defaults, cache }: ClientStateConfig = { resolvers: {} },
) => {
  if (cache && defaults) {
    cache.writeData({ data: defaults });
  }

  return new class StateLink extends ApolloLink {
    writeDefaults() {
      cache && cache.writeData({ data: defaults });
    }

    request(operation: Operation, forward: NextLink): Observable<FetchResult> {
      const isClient = hasDirectives(['client'], operation.query);

      if (!isClient) return forward(operation);

      const server = removeClientSetsFromDocument(operation.query);
      const { query } = operation;
      const type =
        capitalizeFirstLetter(
          (getMainDefinition(query) || ({} as any)).operation,
        ) || 'Query';

      const resolver = (fieldName, rootValue = {}, args, context, info) => {
        const fieldValue = rootValue[fieldName];
        if (fieldValue !== undefined) return fieldValue;

        // Look for the field in the custom resolver map
        const resolverMap = resolvers[(rootValue as any).__typename || type];
        const resolve = resolverMap[fieldName];
        if (resolve) return resolve(rootValue, args, context, info);
      };

      return new Observable(observer => {
        if (server) operation.query = server;
        const obs =
          server && forward
            ? forward(operation)
            : Observable.of({
                data: {},
              });

        const observerErrorHandler = observer.error.bind(observer);

        const sub = obs.subscribe({
          next: ({ data, errors }) => {
            const context = operation.getContext();

            graphql(resolver, query, data, context, operation.variables)
              .then(nextData => {
                observer.next({
                  data: nextData,
                  errors,
                });
                observer.complete();
              })
              .catch(observerErrorHandler);
          },
          error: observerErrorHandler,
        });

        return () => {
          if (sub) sub.unsubscribe();
        };
      });
    }
  }();
};
