# Change log

### vNEXT
- Fix propogating errors thrown in resolvers [#148](https://github.com/apollographql/apollo-link-state/pull/148)

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
