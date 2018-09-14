# Change log

### vNEXT

### 0.4.2
- Allow providing resolvers via function [#293](https://github.com/apollographql/apollo-link-state/pull/293)
- Add support for DocumentNode input to `typeDefs` [#284](https://github.com/apollographql/apollo-link-state/pull/284)
- Remove dependency on zen-observable's flatMap [#284](https://github.com/apollographql/apollo-link-state/pull/284)

### 0.4.1
- Return defaults when no Queries resolver is found and check for `resolverMap` [#202](https://github.com/apollographql/apollo-link-state/pull/202)
- Fix for merging local & remote data not part of same selection set [#193](https://github.com/apollographql/apollo-link-state/pull/193)
- Fix Typescript sourcemaps [#211](https://github.com/apollographql/apollo-link-state/pull/211)
- Set schema on context with each request [#197](https://github.com/apollographql/apollo-link-state/pull/197)

### 0.4.0
- Change config destructuring to support TS strict mode [#165](https://github.com/apollographql/apollo-link-state/pull/165)
- Add `typeDefs` config property for client-side schemas [#180](https://github.com/apollographql/apollo-link-state/pull/180)
- Upgraded `apollo-utilities` [#195](https://github.com/apollographql/apollo-link-state/pull/195)

### 0.3.1
- Fix propogating errors thrown in resolvers [#148](https://github.com/apollographql/apollo-link-state/pull/148)
- Support aliases in @client queries [#150](https://github.com/apollographql/apollo-link-state/pull/150)
- Fix aliases for default resolvers for @client queries [#162](https://github.com/apollographql/apollo-link-state/pull/162)
- Exposed writeDefaults method on the state link for `client.onResetStore` [#164](https://github.com/apollographql/apollo-link-state/pull/164)
- Removed writeData monkey-patching [#164](https://github.com/apollographql/apollo-link-state/pull/164)

### 0.3.0
- BREAKING: Changed `withClientState` API to take a config object with `resolvers`, `defaults`, and `cache` properties: [#132](https://github.com/apollographql/apollo-link-state/pull/132)
- Fix overriding fragment parent's __typename: [#131](https://github.com/apollographql/apollo-link-state/pull/131)

### 0.2.0
- Added `cache.writeData` to easily write data to the cache: [#123](https://github.com/apollographql/apollo-link-state/pull/123)

### 0.1.0
- official async support

### 0.0.5-alpha.0
- moved to lerna repo for examples
- added support for async state

### 0.0.4
- fix to use aliases in server-side query responses

### 0.0.3
- fix mutation of operation breaking context access

### 0.0.2
- ensure source data is passed to resolvers

### 0.0.1
- initial release
