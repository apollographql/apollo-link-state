import {
  ApolloLink,
  Observable,
  Operation,
  NextLink,
  FetchResult,
} from 'apollo-link';
import { ApolloCache } from 'apollo-cache';
import { DocumentNode } from 'graphql';

import { hasDirectives, getMainDefinition } from 'apollo-utilities';

import * as Async from 'graphql-anywhere/lib/async';
const { graphql } = Async;

import { FragmentMatcher } from 'graphql-anywhere';

import { removeClientSetsFromDocument, normalizeTypeDefs } from './utils';

const capitalizeFirstLetter = str => str.charAt(0).toUpperCase() + str.slice(1);

export type ClientStateConfig = {
  cache?: ApolloCache<any>;
  resolvers: any | (() => any);
  defaults?: any;
  typeDefs?: string | string[] | DocumentNode | DocumentNode[];
  fragmentMatcher?: FragmentMatcher;
};

export const withClientState = (
  clientStateConfig: ClientStateConfig = { resolvers: {}, defaults: {} },
) => {
  const { defaults, cache, typeDefs, fragmentMatcher } = clientStateConfig;
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

        const definition = normalizeTypeDefs(typeDefs);

        operation.setContext(({ schemas = [] }) => ({
          schemas: schemas.concat([{ definition, directives }]),
        }));
      }

      const isClient = hasDirectives(['client'], operation.query);

      if (!isClient) return forward(operation);

      const resolvers =
        typeof clientStateConfig.resolvers === 'function'
          ? clientStateConfig.resolvers()
          : clientStateConfig.resolvers;
      const server = removeClientSetsFromDocument(operation.query);
      const { query } = operation;
      const type =
        capitalizeFirstLetter(
          (getMainDefinition(query) || ({} as any)).operation,
        ) || 'Query';

      const resolver = (fieldName, rootValue = {}, args, context, info) => {
        const { resultKey } = info;

        // rootValue[fieldName] is where the data is stored in the "canonical model"
        // rootValue[info.resultKey] is where the user wants the data to be.
        // If fieldName != info.resultKey -- then GraphQL Aliases are in play
        // See also:
        // - https://github.com/apollographql/apollo-client/tree/master/packages/graphql-anywhere#resolver-info
        // - https://github.com/apollographql/apollo-link-rest/pull/113

        // Support GraphQL Aliases!
        const aliasedNode = rootValue[resultKey];
        const preAliasingNode = rootValue[fieldName];
        const aliasNeeded = resultKey !== fieldName;

        // If aliasedValue is defined, some other link or server already returned a value
        if (aliasedNode !== undefined || preAliasingNode !== undefined) {
          return aliasedNode || preAliasingNode;
        }

        // Look for the field in the custom resolver map
        const resolverMap = resolvers[(rootValue as any).__typename || type];
        if (resolverMap) {
          const resolve = resolverMap[fieldName];
          if (resolve) return resolve(rootValue, args, context, info);
        }

        // TODO: the proper thing to do here is throw an error saying to
        // add `client.onResetStore(link.writeDefaults);`
        // waiting on https://github.com/apollographql/apollo-client/pull/3010

        return (
          // Support nested fields
          (aliasNeeded ? aliasedNode : preAliasingNode) ||
          (defaults || {})[fieldName]
        );
      };

      if (server) operation.query = server;
      const obs =
        server && forward
          ? forward(operation)
          : Observable.of({
              data: {},
            });

      return new Observable(observer => {
        // Works around race condition between completion and graphql execution
        // finishing. If complete is called during the graphql call, we will
        // miss out on the result, since the observer will have completed
        let complete = false;
        let handlingNext = false;
        obs.subscribe({
          next: ({ data, errors }) => {
            const observerErrorHandler = observer.error.bind(observer);
            const context = operation.getContext();

            handlingNext = true;
            //data is from the server and provides the root value to this GraphQL resolution
            //when there is no resolver, the data is taken from the context
            graphql(resolver, query, data, context, operation.variables, {
              fragmentMatcher,
            })
              .then(nextData => {
                observer.next({
                  data: nextData,
                  errors,
                });
                if (complete) {
                  observer.complete();
                }
                handlingNext = false;
              })
              .catch(observerErrorHandler);
          },
          error: observer.error.bind(observer),
          complete: () => {
            if (!handlingNext) {
              observer.complete();
            }
            complete = true;
          },
        });
      });
    }
  }();
};
