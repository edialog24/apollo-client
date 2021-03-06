import { NetworkInterface, ObservableNetworkInterface } from './transport/networkInterface';
import { ExecutionResult } from 'graphql';
import { FragmentMatcherInterface } from './data/fragmentMatcher';
import { ApolloStore, ApolloReducerConfig, Store } from './store';
import { ApolloAction } from './actions';
import { CustomResolverMap } from './data/readFromStore';
import { QueryManager } from './core/QueryManager';
import { ApolloQueryResult, IdGetter } from './core/types';
import { ObservableQuery } from './core/ObservableQuery';
import { Observable } from './util/Observable';
import { WatchQueryOptions, SubscriptionOptions, MutationOptions } from './core/watchQueryOptions';
import { DataProxy, DataProxyReadQueryOptions, DataProxyReadFragmentOptions, DataProxyWriteQueryOptions, DataProxyWriteFragmentOptions } from './data/proxy';
export declare type ApolloStateSelector = (state: any) => Store;
export default class ApolloClient implements DataProxy {
    networkInterface: NetworkInterface;
    store: ApolloStore;
    reduxRootSelector: ApolloStateSelector | null;
    initialState: any;
    queryManager: QueryManager;
    reducerConfig: ApolloReducerConfig;
    addTypename: boolean;
    disableNetworkFetches: boolean;
    dataId: IdGetter | undefined;
    dataIdFromObject: IdGetter | undefined;
    fieldWithArgs: (fieldName: string, args?: Object) => string;
    version: string;
    queryDeduplication: boolean;
    private devToolsHookCb;
    private proxy;
    private fragmentMatcher;
    private ssrMode;
    constructor(options?: {
        networkInterface?: NetworkInterface | ObservableNetworkInterface;
        reduxRootSelector?: string | ApolloStateSelector;
        initialState?: any;
        dataIdFromObject?: IdGetter;
        ssrMode?: boolean;
        ssrForceFetchDelay?: number;
        addTypename?: boolean;
        customResolvers?: CustomResolverMap;
        connectToDevTools?: boolean;
        queryDeduplication?: boolean;
        fragmentMatcher?: FragmentMatcherInterface;
    });
    watchQuery<T>(options: WatchQueryOptions): ObservableQuery<T>;
    query<T>(options: WatchQueryOptions): Promise<ApolloQueryResult<T>>;
    mutate<T>(options: MutationOptions): Promise<ExecutionResult>;
    subscribe(options: SubscriptionOptions): Observable<any>;
    readQuery<T>(options: DataProxyReadQueryOptions): T;
    readFragment<T>(options: DataProxyReadFragmentOptions): T | null;
    writeQuery(options: DataProxyWriteQueryOptions): void;
    writeFragment(options: DataProxyWriteFragmentOptions): void;
    reducer(): (state: Store, action: ApolloAction) => Store;
    __actionHookForDevTools(cb: Function): void;
    middleware: () => (store: ApolloStore) => (next: any) => (action: any) => any;
    initStore(): void;
    resetStore(): Promise<ApolloQueryResult<any>[]> | null;
    getInitialState(): {
        data: Object;
    };
    private setStore(store);
    private initProxy();
}
