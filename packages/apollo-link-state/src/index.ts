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
  typeDefs?: string | string[];
};

export const withClientState = (
  clientStateConfig: ClientStateConfig = { resolvers: {}, defaults: {} },
) => {
  const { resolvers, defaults, cache, typeDefs } = clientStateConfig;
  if (cache && defaults) {
    cache.writeData({ data: defaults });
  }

  return new class StateLink extends ApolloLink {
    public writeDefaults() {
      if (cache && defaults) {
        cache.writeData({ data: defaults });
      }
    }

    public request(
      operation: Operation,
      forward: NextLink = () => Observable.of({ data: {} }),
    ): Observable<FetchResult> {
      if (typeDefs) {
        const directives = 'directive @client on FIELD';
        const definition =
          typeof typeDefs === 'string'
            ? typeDefs
            : typeDefs.map(typeDef => typeDef.trim()).join('\n');

        operation.setContext(({ schemas = [] }) => ({
          schemas: schemas.concat([{ definition, directives }]),
        }));
      }

      const isClient = hasDirectives(['client'], operation.query);

      if (!isClient) return forward(operation);

      const server = removeClientSetsFromDocument(operation.query);
      const { query } = operation;
      const type =
        capitalizeFirstLetter(
          (getMainDefinition(query) || ({} as any)).operation,
        ) || 'Query';

      const resolver = (fieldName, rootValue = {}, args, context, info) => {
        //resultKey is where data under the field name is ultimately returned by the server
        //https://github.com/apollographql/apollo-client/tree/master/packages/graphql-anywhere#resolver-info
        const fieldValue = rootValue[info.resultKey];

        const useServerReturnedValue =
          fieldValue !== undefined &&
          ((rootValue as any).__typename || type) == 'Query';

        //If fieldValue is defined and we are at the Query level, server returned a value so we return it
        if (useServerReturnedValue) {
          return fieldValue;
        }

        // Look for the field in the custom resolver map
        const resolverMap = resolvers[(rootValue as any).__typename || type];
        if (resolverMap) {
          const resolve = resolverMap[fieldName];
          if (resolve) return resolve(rootValue, args, context, info);
          if (fieldValue !== undefined) return fieldValue;
        }
        if (fieldValue !== undefined) {
          return fieldValue;
        }

        //TODO: the proper thing to do here is throw an error saying to
        //add `client.onResetStore(link.writeDefaults);`
        //waiting on https://github.com/apollographql/apollo-client/pull/3010
        //Currently with nested fields, this sort of return does not work

        return defaults[fieldName];
      };

      if (server) operation.query = server;
      const obs =
        server && forward
          ? forward(operation)
          : Observable.of({
              data: {},
            });

      return obs.flatMap(
        ({ data, errors }) =>
          new Observable(observer => {
            const observerErrorHandler = observer.error.bind(observer);
            const context = operation.getContext();
            //data is from the server and provides the root value to this GraphQL resolution
            //when there is no resolver, the data is taken from the context
            graphql(resolver, query, data, context, operation.variables)
              .then(nextData => {
                observer.next({
                  data: nextData,
                  errors,
                });
                observer.complete();
              })
              .catch(observerErrorHandler);
          }),
      );
    }
  }();
};
